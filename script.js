const cloudName = "djbtmpqh9";
const uploadPreset = "memories";
const supabaseUrl = "https://exjkutkqcsoxyjnimlhh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amt1dGtxY3NveHlqbmltbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDU2NDgsImV4cCI6MjA4NzQyMTY0OH0.blV_tGKnx_Q6LqSqx4-K1ioLCaBgrCLkpuNEeHQJD9s";

// Fix: Use supabase.createClient directly
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const fileInput = document.getElementById("fileInput");
const gallery = document.getElementById("gallery");

async function loadMemories() {
  gallery.innerHTML = "";
  const { data, error } = await supabaseClient.from("memories").select("*").order("created_at", { ascending: false });
  if (error) return console.error("Supabase Load Error:", error);
  data.forEach(item => displayMedia(item.url, item.type, item.id));
}

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files);
  for (let file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: formData });
      const uploadData = await res.json();
      if (!uploadData.secure_url) { console.error("Cloudinary Error:", uploadData); continue; }

      const { data: inserted, error: insertError } = await supabaseClient.from("memories").insert([{ url: uploadData.secure_url, type: file.type }]).select();
      if (insertError) console.error("Supabase Insert Error:", insertError);
      else displayMedia(uploadData.secure_url, file.type, inserted[0].id);
    } catch(err) { console.error("Upload Error:", err); }
  }
});

function displayMedia(url, type, id) {
  const container = document.createElement("div");
  container.className = "media-container";

  let media = type.startsWith("image") ? document.createElement("img") : document.createElement("video");
  media.src = url;
  if (!type.startsWith("image")) media.controls = true;

  // Save/Download Button (সবার জন্য)
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.cssText = "background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-right: 5px;";
  saveBtn.onclick = async () => {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `memory_${id}`;
    link.click();
  };

  container.append(media, saveBtn);

  // Delete Button (শুধুমাত্র আপনার জন্য)
  // আপনার ইউআরএল এর শেষে ?admin=1 লিখলে ডিলিট বাটন আসবে
  const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';

  if (isAdmin) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.style.cssText = "background: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;";
    delBtn.onclick = async () => {
      const { error } = await supabaseClient.from("memories").delete().eq("id", id);
      if (!error) gallery.removeChild(container);
    };
    container.append(delBtn);
  }

  gallery.appendChild(container);
}

loadMemories();