"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GenerationModelSelect } from "@/components/workspace/generation-model-select";
import { Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { operationLabels, parseBudget, usd } from "@/lib/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { GenerationOperation, ProjectBudget } from "@/types/ripple";

export function BudgetSummary({ budget }: { budget: ProjectBudget }) {
  const held = budget.reserved_cents + budget.spent_cents;
  return <div className="grid gap-3">
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      {[ ["Budget", budget.limit_cents === null ? "Not set" : usd(budget.limit_cents)], ["Available", usd(budget.available_cents)], ["Reserved", usd(budget.reserved_cents)], ["Estimated spent", usd(budget.spent_cents)] ].map(([label, value]) => <div key={label} className="rounded-md border p-3"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}
    </dl>
    {budget.limit_cents !== null && budget.limit_cents > 0 && held >= budget.limit_cents * 0.8 && <p role="status" className="text-sm text-amber-700">{held >= budget.limit_cents ? "Budget fully allocated." : "80% or more of this budget is allocated."} Spending and active reservations count toward the limit.</p>}
  </div>;
}
function BudgetForm({ budget, projectId, token }: { budget: ProjectBudget; projectId: string; token: string }) {
  const [value, setValue] = useState(budget.limit_cents === null ? "" : (budget.limit_cents / 100).toFixed(2));
  const cache = useQueryClient();
  const cents = parseBudget(value);
  const save = useMutation({ mutationFn: () => api.setBudget(projectId, cents!, token), onSuccess: (updated) => { cache.setQueryData(["budget", token, projectId], updated); } });
  function submit(event: FormEvent) { event.preventDefault(); if (cents !== null && !save.isPending) save.mutate(); }
  return <form onSubmit={submit} className="grid gap-2">
    <Label htmlFor={`budget-${projectId}`}>Project media budget (USD)</Label>
    <div className="flex gap-2"><Input id={`budget-${projectId}`} inputMode="decimal" value={value} disabled={save.isPending} onChange={(event) => setValue(event.target.value)} placeholder="100.00" required /><Button type="submit" disabled={save.isPending || cents === null || cents < budget.reserved_cents + budget.spent_cents}>{save.isPending ? "Saving…" : "Save budget"}</Button></div>
    <p className="text-xs text-muted-foreground">Up to $1,000,000. Cannot be reduced below spending and reservations. A zero budget blocks new media requests.</p>
    {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
  </form>;
}
export function ProjectBudgetButton({ projectId, token, iconOnly = false }: { projectId: string; token: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["budget", token, projectId], queryFn: () => api.budget(projectId, token), enabled: open, refetchInterval: open ? 10000 : false });
  return <>
    <Button variant="outline" size={iconOnly ? "icon-sm" : "sm"} aria-label="Manage project budget" title="Manage project budget" onClick={() => setOpen(true)}><Wallet />{!iconOnly && "Budget"}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-md sm:max-w-4xl">
      <DialogHeader><DialogTitle>Project generation budget</DialogTitle><DialogDescription>Control media generation spending and review the latest 100 requests. Amounts are USD estimates, not provider invoices.</DialogDescription></DialogHeader>
      {query.isPending ? <p>Loading budget…</p> : query.isError ? <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div> : <div className="grid gap-5">
        <BudgetSummary budget={query.data} />
        <BudgetForm key={String(query.data.limit_cents)} budget={query.data} projectId={projectId} token={token} />
        <section className="grid gap-2 text-sm"><h3 className="font-semibold">Estimates per request</h3>{Object.entries(operationLabels).map(([key, label]) => <p key={key} className="flex justify-between gap-3"><span>{label}</span><span>{query.data.rates[key as GenerationOperation] > 0 ? usd(query.data.rates[key as GenerationOperation]) : "Not configured"}</span></p>)}</section>
        <p className="text-xs text-muted-foreground">An administrator must configure missing rates. Unknown submissions remain reserved. Accepted requests that fail still count toward estimated spending until provider billing is reconciled. Summary and storyboard AI calls, storage, and earlier generations are outside this media budget.</p>
        <div className="overflow-hidden rounded-md border"><Table aria-label="Generation usage ledger"><TableHeader><TableRow><TableHead>Request</TableHead><TableHead>Created by</TableHead><TableHead>Estimate</TableHead><TableHead>Budget state</TableHead><TableHead>Job status</TableHead><TableHead>Created at</TableHead></TableRow></TableHeader><TableBody>
          {query.data.usage.length ? query.data.usage.map((entry) => <TableRow key={entry.operation_id}><TableCell><p>{operationLabels[entry.operation]}</p><p className="max-w-64 truncate text-xs text-muted-foreground" title={entry.description}>{entry.description}</p></TableCell><TableCell>{entry.actor}</TableCell><TableCell>{usd(entry.estimate_cents)}</TableCell><TableCell>{entry.state === "spent" ? "Estimated spent" : entry.state}</TableCell><TableCell>{entry.status.replaceAll("_", " ")}</TableCell><TableCell><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("en-US")}</time></TableCell></TableRow>) : <TableRow><TableCell colSpan={6}>No budgeted media requests yet.</TableCell></TableRow>}
        </TableBody></Table></div>
      </div>}
    </DialogContent></Dialog>
  </>;
}

export function GenerationBudgetDialog({ projectId, token, operation, onClose, onConfirm }: { projectId: string; token: string; operation: GenerationOperation; onClose: () => void; onConfirm: () => void }) {
  const query = useQuery({ queryKey: ["budget", token, projectId], queryFn: () => api.budget(projectId, token), refetchOnMount: "always" });
  const estimate = query.data?.rates[operation] || 0;
  const allowed = !query.isFetching && !query.isError && query.data?.limit_cents !== null && estimate > 0 && (query.data?.available_cents || 0) >= estimate;
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="rounded-md sm:max-w-xl"><DialogHeader><DialogTitle>{operationLabels[operation]}</DialogTitle><DialogDescription>Review the estimated cost before sending this paid request.</DialogDescription></DialogHeader>
    {query.isPending ? <p>Checking budget…</p> : query.isError ? <div role="alert"><p>{query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></div> : <div className="grid gap-3">
      <BudgetSummary budget={query.data} />
      <p className="text-sm">Estimated request cost: <strong>{estimate > 0 ? usd(estimate) : "Not configured"}</strong></p>
      {query.data.limit_cents === null ? <p role="alert">Set this project’s budget first.</p> : estimate <= 0 ? <p role="alert">The administrator needs to configure this cost estimate before generation is available.</p> : estimate > query.data.available_cents ? <p role="alert">This request exceeds the available project budget.</p> : <p className="text-sm">Available after reservation: {usd(query.data.available_cents - estimate)}</p>}
      <p className="text-xs text-muted-foreground">The backend reserves budget before submission. Actual provider charges may differ from this estimate.</p>
    </div>}
    <div className="flex w-full max-w-[440px] flex-row items-end gap-2">
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <GenerationModelSelect kind={operation} />
      <Button variant="generation" className="h-auto min-h-8 min-w-0 flex-[2] py-1 whitespace-normal" disabled={!allowed} onClick={onConfirm}>Confirm generation</Button>
    </div>
  </DialogContent></Dialog>;
}
