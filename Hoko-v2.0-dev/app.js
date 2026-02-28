// ==================================================
// GLOBAL STATE (must be at the top)
// ==================================================
let selectedPhotoData = null;
let activeListingId = null;
let isEditing = false;

function loadQuickPosts() {
  const stored = localStorage.getItem("quickPosts");
  return stored ? JSON.parse(stored) : [];
}

let quickPosts = loadQuickPosts();

function saveQuickPosts() {
  localStorage.setItem("quickPosts", JSON.stringify(quickPosts));
}

// ==================================================
// UUID helper (fallback for older browsers)
// ==================================================
function uuid() {
  try {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ==================================================
// SEED QUICK POSTS
// ==================================================
const seedQuickPosts = [
  {
    mode: "request",
    title: "Does anyone have a ladder I can borrow?",
    want: "",
    suburb: "Wainuiomata",
    userId: "seedUser",
    archived: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
  },
  {
    mode: "offer",
    title: "Free lemons outside my gate — please take some!",
    want: "",
    suburb: "Alicetown",
    userId: "seedUser",
    archived: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    mode: "request",
    title: "Lost cat near Rintoul St — small grey tabby",
    want: "",
    suburb: "Newtown",
    userId: "seedUser",
    archived: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    mode: "offer",
    title: "Happy to help with rides to the supermarket today",
    want: "",
    suburb: "Petone",
    userId: "seedUser",
    archived: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  }
];

// ==================================================
// APP STARTUP
// ==================================================
document.addEventListener("DOMContentLoaded", () => {
  seedDemoListings();
  refreshAllListings();

  if (!quickPosts || quickPosts.length === 0) {
    quickPosts = [...seedQuickPosts];
    saveQuickPosts();
  }

  renderQuickPosts();

  // Wire search button and Enter key
  const searchBtn = document.getElementById("search-btn");
  if (searchBtn) searchBtn.addEventListener("click", runSearch);

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch();
    });
  }
});

// ==================================================
// TIME AGO HELPER (accepts ISO or numeric timestamps)
// ==================================================
function timeAgo(input) {
  const t = typeof input === "number" ? input : new Date(input).getTime();
  const diff = Date.now() - t;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// ==================================================
// QUICK POST TABS
// ==================================================
document.querySelectorAll(".qp-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".qp-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const warning = document.getElementById("qp-offer-warning");
    if (warning) warning.style.display = tab.dataset.mode === "offer" ? "block" : "none";
  });
});

// ==================================================
// QUICK POST SUBMIT
// ==================================================
document.getElementById("qp-submit")?.addEventListener("click", () => {
  const mode = document.querySelector(".qp-tab.active")?.dataset.mode || "request";
  const title = document.getElementById("qp-title")?.value.trim() || "";
  const want = document.getElementById("qp-want")?.value.trim() || "";
  const suburb = "Your Suburb";

  if (!title) return;

  const post = createQuickPost(mode, title, want, suburb);
  quickPosts.unshift(post);

  saveQuickPosts();
  renderQuickPosts();

  document.getElementById("qp-title").value = "";
  document.getElementById("qp-want").value = "";
});

// ==================================================
// QUICK POST FUNCTIONS
// ==================================================
function createQuickPost(mode, title, want, suburb) {
  return {
    id: uuid(),
    userId: "currentUser",
    mode,
    title,
    want,
    suburb,
    createdAt: new Date().toISOString(),
    archived: false
  };
}

function renderQuickPosts() {
  const container = document.getElementById("qp-feed-list");
  if (!container) return;
  container.innerHTML = "";

  quickPosts.forEach(post => {
    const div = document.createElement("div");
    div.className = "qp-card";

    div.innerHTML = `
      <div class="qp-card-mode ${post.mode}">${post.mode}</div>
      <div class="qp-card-title">${escapeHtml(post.title)}</div>
      <div class="qp-card-suburb">${escapeHtml(post.suburb)} • ${timeAgo(post.createdAt)}</div>
    `;

    container.appendChild(div);
  });
}

// ==================================================
// NEW NAVIGATION SYSTEM
// ==================================================
function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));

  const view = document.getElementById(viewId);
  if (view) view.classList.add("active");

  document.querySelectorAll(".sidebar-nav button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });
}

document.querySelectorAll(".sidebar-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    const viewId = btn.dataset.view;
    showView(viewId);
  });
});

// ==================================================
// PHOTO PREVIEW + PICKER
// ==================================================
function el(id, fallbackId) {
  return document.getElementById(id) || (fallbackId ? document.getElementById(fallbackId) : null);
}

function setPhotoPreview(data) {
  const preview = el("create-photo-preview", "photo-preview");
  if (!preview) return;

  if (data) {
    preview.src = data;
    preview.style.display = "block";
    selectedPhotoData = data;
  } else {
    preview.src = "";
    preview.style.display = "none";
    selectedPhotoData = null;
  }
}

window.openPhotoPicker = function () {
  const photoInput = el("create-photo-input", "listing-photo");
  const photoPreview = el("create-photo-preview", "photo-preview");

  if (!photoInput || !photoPreview) return;

  photoInput.click();

  photoInput.onchange = function () {
    const file = photoInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function () {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
};

// ==================================================
// PROFILE SETUP
// ==================================================
window.completeSetup = function () {
  const name = document.getElementById("setup-name")?.value.trim() || "";
  const suburb = document.getElementById("setup-suburb")?.value.trim() || "";
  const agreed = document.getElementById("setup-agree")?.checked;

  if (!name || !suburb) {
    alert("Please fill in your name and suburb");
    return;
  }

  if (!agreed) {
    alert("You must agree to the rules");
    return;
  }

  localStorage.setItem("hh_user_name", name);
  localStorage.setItem("hh_user_suburb", suburb);
  localStorage.setItem("hh_profile_complete", "true");

  alert("Setup complete");
  showView("view-home");
};

// ==================================================
// LISTINGS STORAGE
// ==================================================
function getListings() {
  return JSON.parse(localStorage.getItem("hh_listings") || "[]");
}

function saveListings(listings) {
  localStorage.setItem("hh_listings", JSON.stringify(listings));
}

function addListing(listing) {
  const listings = getListings();
  listings.unshift(listing);
  saveListings(listings);
}

// ==================================================
// SEARCH
// ==================================================
function runSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const myName = localStorage.getItem("hh_user_name") || "";

  const listings = getListings().filter(l => l.owner !== myName);

  if (!query) {
    renderListings("home-suggested", listings);
    return;
  }

  const results = listings.filter(l =>
    (l.title || "").toLowerCase().includes(query) ||
    (l.description || "").toLowerCase().includes(query) ||
    (l.want || "").toLowerCase().includes(query) ||
    (l.suburb || "").toLowerCase().includes(query) ||
    (l.type || "").toLowerCase().includes(query)
  );

  // render into suggested area for now (keep UI consistent)
  renderListings("home-suggested", results);
}

// ==================================================
// LISTING RENDERING
// ==================================================
function renderListings(containerId, listings) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (!listings || listings.length === 0) {
    container.innerHTML = "<div>No listings yet.</div>";
    return;
  }

  listings.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    // ensure photo markup matches detail view (.card-img contains an <img>)
    const photoSrc = item.photo || 'assets/placeholder-listing.jpg';
    card.innerHTML = `
      <div class="card-img">
        <img src="${escapeHtml(photoSrc)}" class="listing-thumb" alt="${escapeHtml(item.title || 'Listing photo')}" />
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(item.title)}</div>
        <div>${escapeHtml(item.want || '')}</div>
        <div class="card-meta">
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.suburb || '')}"
             target="_blank" rel="noopener noreferrer">${escapeHtml(item.suburb || '')}</a>
        </div>
      </div>
    `;

    // attach data-id as string to avoid type mismatch
    card.dataset.id = String(item.id);
    card.addEventListener("click", () => openListing(card.dataset.id));
    container.appendChild(card);
  });
}

// ==================================================
// LISTING DETAIL VIEW
// ==================================================
function openListing(id) {
  activeListingId = id;

  const listing = getListings().find(l => String(l.id) === String(id));
  if (!listing) return;

  document.getElementById("listing-title").textContent = listing.title || "";
  document.getElementById("listing-description").textContent = listing.description || "";
  document.getElementById("listing-type").textContent = listing.type || "";
  document.getElementById("listing-suburb").textContent = listing.suburb || "";
  document.getElementById("listing-want").textContent = listing.want || "";

  const photoEl = document.getElementById("listing-photo");
  if (photoEl) {
    photoEl.src = listing.photo || "assets/placeholder-listing.jpg";
    photoEl.style.display = "block";
  }

  const myName = localStorage.getItem("hh_user_name") || "";

  document.getElementById("delete-listing-btn").style.display =
    listing.owner === myName ? "inline-block" : "none";

  document.getElementById("edit-listing-btn").style.display =
    listing.owner === myName ? "inline-block" : "none";

  showView("view-listing");
}

// ==================================================
// CREATE FORM HELPERS
// ==================================================
function resetCreateForm() {
  const titleEl = el("create-title");
  const descEl = el("create-description");
  const typeEl = el("trade-type");
  const wantEl = el("create-want");

  if (titleEl) titleEl.value = "";
  if (descEl) descEl.value = "";
  if (typeEl) typeEl.value = "";
  if (wantEl) wantEl.value = "";

  setPhotoPreview(null);

  isEditing = false;
  activeListingId = null;
}

// ==================================================
// CREATE LISTING
// ==================================================
window.submitListing = function () {
  const title = el("create-title")?.value.trim() || "";
  const description = el("create-description")?.value.trim() || "";
  const type = el("trade-type")?.value || "";
  const want = el("create-want")?.value.trim() || "";

  if (!title || !want) {
    alert("Please fill in required fields.");
    return;
  }

  const listings = getListings();
  const myName = localStorage.getItem("hh_user_name") || "";

  if (isEditing && activeListingId) {
    const index = listings.findIndex(l => String(l.id) === String(activeListingId));
    if (index !== -1) {
      if (listings[index].owner !== myName) {
        alert("You are not allowed to edit this listing.");
        return;
      }

      listings[index].title = title;
      listings[index].description = description;
      listings[index].type = type;
      listings[index].want = want;
      listings[index].photo = selectedPhotoData || listings[index].photo;

      saveListings(listings);

      resetCreateForm();
      refreshAllListings();
      showView("view-profile");
      return;
    }
  }

  const listing = {
    id: uuid(),
    title,
    description,
    type,
    want,
    owner: myName,
    suburb: localStorage.getItem("hh_user_suburb") || "",
    photo: selectedPhotoData,
    createdAt: new Date().toISOString()
  };

  addListing(listing);

  resetCreateForm();
  refreshAllListings();
  showView("view-home");
};

// ==================================================
// EDIT LISTING
// ==================================================
window.editListing = function () {
  const listings = getListings();
  const listing = listings.find(l => String(l.id) === String(activeListingId));
  if (!listing) return;

  el("create-title").value = listing.title || "";
  el("create-description").value = listing.description || "";
  el("trade-type").value = listing.type || "";
  el("create-want").value = listing.want || "";

  setPhotoPreview(listing.photo || null);

  isEditing = true;
  activeListingId = listing.id;

  showView("view-create");
};

// ==================================================
// DELETE LISTING
// ==================================================
window.openDeleteModal = function () {
  document.getElementById("delete-modal").style.display = "flex";
};

window.closeDeleteModal = function () {
  document.getElementById("delete-modal").style.display = "none";
};

window.deleteListingConfirmed = function () {
  if (!activeListingId) return;

  const listings = getListings();
  const myName = localStorage.getItem("hh_user_name") || "";
  const listing = listings.find(l => String(l.id) === String(activeListingId));

  if (!listing || listing.owner !== myName) return;

  const filtered = listings.filter(l => String(l.id) !== String(activeListingId));
  saveListings(filtered);

  activeListingId = null;

  closeDeleteModal();
  refreshAllListings();
  showView("view-profile");
};

// ==================================================
// GLOBAL REFRESH
// ==================================================
function refreshAllListings() {
  const listings = getListings();
  const myName = localStorage.getItem("hh_user_name") || "";

  renderListings("home-suggested", listings);
  renderListings("home-new", listings);
  renderListings("home-skills", listings.filter(l => l.type === "Skill / Labour"));

  renderListings(
    "profile-listings",
    listings.filter(l => l.owner === myName)
  );
}

// ==================================================
// INITIAL APP LOAD
// ==================================================
refreshAllListings();
showView(localStorage.getItem("hh_profile_complete") ? "view-home" : "view-setup");

// ==================================================
// SEED DEMO LISTINGS
// ==================================================
function seedDemoListings() {
  if (localStorage.getItem("hh_seeded")) return;

  const demoListings = [
    {
      id: uuid(),
      title: "18V Cordless Drill",
      description: "Good condition, includes charger and 2 batteries.",
      type: "Item",
      want: "Lawn mowing or handyman help",
      owner: "Adept",
      suburb: "Lower Hutt",
      category: "Tools & DIY",
      value: "50-100",
      photo: null,
      createdAt: new Date().toISOString()
    },
    {
      id: uuid(),
      title: "Weekend Lawn Mowing",
      description: "Can mow small to medium lawns. Bring my own mower.",
      type: "Skill / Labour",
      want: "Kids bike or power tools",
      owner: "Sam",
      suburb: "Petone",
      category: "Skills & Labour",
      value: "20-50",
      photo: null,
      createdAt: new Date().toISOString()
    },
    {
      id: uuid(),
      title: "Kids Bike (16–18 inch)",
      description: "Looking for a bike for my 6‑year‑old. Happy to trade.",
      type: "Request (I need…)",
      want: "House cleaning or gardening",
      owner: "Jess",
      suburb: "Naenae",
      category: "Kids & Baby",
      value: "50-100",
      photo: null,
      createdAt: new Date().toISOString()
    },
    {
      id: uuid(),
      title: "Basic Website Setup",
      description: "Can build a simple website or landing page.",
      type: "Skill / Labour",
      want: "Power tools or electronics",
      owner: "Adept",
      suburb: "Lower Hutt",
      category: "Skills & Labour",
      value: "100-plus",
      photo: null,
      createdAt: new Date().toISOString()
    },
    {
      id: uuid(),
      title: "Pressure Washer",
      description: "Works well, great for decks and driveways.",
      type: "Item",
      want: "Painting help or trailer use",
      owner: "Mike",
      suburb: "Wainuiomata",
      category: "Home & Garden",
      value: "100-plus",
      photo: null,
      createdAt: new Date().toISOString()
    }
  ];

  localStorage.setItem("hh_listings", JSON.stringify(demoListings));
  localStorage.setItem("hh_seeded", "true");
}

// ==================================================
// UTILITIES
// ==================================================
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>"']/g, function (m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}
