const cloudName = "djbtmpqh9";
const uploadPreset = "memories";
const supabaseUrl = "https://exjkutkqcsoxyjnimlhh.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4amt1dGtxY3NveHlqbmltbGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDU2NDgsImV4cCI6MjA4NzQyMTY0OH0.blV_tGKnx_Q6LqSqx4-K1ioLCaBgrCLkpuNEeHQJD9s";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const fileInput = document.getElementById("fileInput");
const gallery = document.getElementById("gallery");

// Admin check via URL (e.g., yoursite.com?admin=1)
const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';

async function loadMemories() {
  gallery.innerHTML = "<p style='text-align:center;'>Loading Memories...</p>";
  const { data, error } = await supabaseClient
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    gallery.innerHTML = "<p>Error loading data.</p>";
    return console.error("Load Error:", error);
  }
  
  gallery.innerHTML = "";
  data.forEach(item => displayMedia(item.url, item.type, item.id));
}

fileInput.addEventListener("change", async () => {
  const files = Array.from(fileInput.files);
  if (files.length === 0) return;

  // বাটন টেক্সট চেঞ্জ করে ইউজারকে ফিডব্যাক দেওয়া
  const label = document.querySelector(".custom-upload-btn span");
  const originalText = label.innerText;
  label.innerText = "Uploading...";

  for (let file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      // Cloudinary Upload
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData
      });
      const uploadData = await res.json();
      
      if (!uploadData.secure_url) {
        alert("Upload failed for: " + file.name);
        continue;
      }

      // Supabase Insert
      const { data: inserted, error: insertError } = await supabaseClient
        .from("memories")
        .insert([{ url: uploadData.secure_url, type: file.type }])
        .select();

      if (!insertError) {
        displayMedia(uploadData.secure_url, file.type, inserted[0].id);
      } else {
        console.error("Database Error:", insertError);
      }
    } catch(err) {
      console.error("Network Error:", err);
    }
  }
  
  label.innerText = originalText;
  fileInput.value = ""; 
});

function displayMedia(url, type, id) {
  const container = document.createElement("div");
  container.className = "media-container";

  let media;
  if (type.startsWith("image")) {
    media = document.createElement("img");
    media.src = url;
    media.loading = "lazy"; // মোবাইলে দ্রুত লোড হওয়ার জন্য
  } else {
    media = document.createElement("video");
    media.src = url;
    media.controls = true;
    media.playsInline = true; // মোবাইল ব্রাউজারে ফুলস্ক্রিন এরর এড়াতে
    media.preload = "metadata";
  }

  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group";

  // Save/Download Button (সবার জন্য)
  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.innerHTML = "⬇️ Save";
  saveBtn.onclick = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `memory_${id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(url, '_blank'); // ফেল করলে নতুন ট্যাবে ওপেন হবে
    }
  };

  btnGroup.appendChild(saveBtn);

  // Admin Delete Button (শুধুমাত্র URL-এ ?admin=1 থাকলে দেখাবে)
  if (isAdmin) {
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.innerHTML = "🗑️ Delete";
    delBtn.onclick = async () => {
      if(confirm("Are you sure you want to delete this?")) {
        const { error } = await supabaseClient.from("memories").delete().eq("id", id);
        if (!error) container.remove();
      }
    };
    btnGroup.appendChild(delBtn);
  }

  container.append(media, btnGroup);
  
  // নতুন আপলোড সবার আগে দেখানোর জন্য prepend ব্যবহার করা হয়েছে
  gallery.prepend(container);
}

loadMemories();
