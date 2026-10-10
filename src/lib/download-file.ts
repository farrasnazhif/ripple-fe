import axios from "axios";

export async function downloadFile(url: string, filename: string) {
  const { data } = await axios.get<Blob>(url, { responseType: "blob" });
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif", "image/svg+xml": "svg",
    "video/mp4": "mp4", "video/webm": "webm", "application/pdf": "pdf", "text/plain": "txt", "application/json": "json", "application/zip": "zip",
    "application/msword": "doc", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  const extension = extensions[data.type.split(";")[0]] || "bin";
  const objectUrl = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = /\.[a-z0-9]{1,8}$/i.test(filename) ? filename : `${filename}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
