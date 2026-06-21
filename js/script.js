const API_URL =
  "https://script.google.com/macros/s/AKfycbzj_qLL3PbAOL5L77_Q_2a0Rfu7iu75ed7meqJxDjljMvA4c3oorsut2cZg0-NWHMR5/exec";

const GET_GUEST_URL =
  "https://script.google.com/macros/s/AKfycbxi9gy-KR84leI6K82_QydgbeSJoF69Frmtt7etOUt_KjUskLJ84_4Q2erc25cAoZLbiw/exec";

const QUEUE_URL =
  "https://script.google.com/macros/s/AKfycbw41s7GSGZrQ4CDKgptG6GAeIinybLc-_nFAJhsjjqAfbXB7uhAN7fN6xVMrva2DRot/exec";

let guestData = [];

const newGuest = document.getElementById("newGuest");
const returningGuest = document.getElementById("returningGuest");
const guestFound = document.getElementById("guestFound");
const notification = document.getElementById("notification");

const searchInput = document.getElementById("searchGuest");
const previewBox = document.getElementById("searchResultPreview");

// LOAD DATA
async function loadGuests() {
  try {
    const res = await fetch(GET_GUEST_URL);
    guestData = await res.json();
  } catch (err) {
    console.error(err);
  }
}

loadGuests();

// SWITCH FORM
document.querySelectorAll('input[name="statusTamu"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.value === "tidak" && radio.checked) {
      newGuest.classList.remove("hidden");
      returningGuest.classList.add("hidden");
    }

    if (radio.value === "ya" && radio.checked) {
      returningGuest.classList.remove("hidden");
      newGuest.classList.add("hidden");
    }
  });
});

// SEARCH LIVE (MULTI RESULT)
searchInput.addEventListener("input", () => {
  const key = searchInput.value.toLowerCase().trim();

  if (!key) {
    previewBox.innerHTML = "";
    return;
  }

  const results = guestData
    .filter(
      (x) =>
        (x.nama && x.nama.toLowerCase().includes(key)) ||
        (x.instansi && x.instansi.toLowerCase().includes(key))
    )
    .slice(0, 6);

  if (results.length === 0) {
    previewBox.innerHTML = `<div class="search-item">❌ Tidak ditemukan</div>`;
    return;
  }

  previewBox.innerHTML = results
    .map((r, i) => {
      const display = r.instansi ? `${r.nama} - ${r.instansi}` : r.nama;

      return `<div class="search-item" data-index="${i}">
                ${display}
              </div>`;
    })
    .join("");

  document.querySelectorAll(".search-item").forEach((item, i) => {
    item.addEventListener("click", () => {
      const selected = results[i];

      document.getElementById("oldName").value = selected.nama || "";
      document.getElementById("oldCompany").value = selected.instansi || "";

      guestFound.classList.remove("hidden");
      previewBox.innerHTML = "";
      searchInput.value = `${selected.nama} - ${selected.instansi}`;
    });
  });
});

// SAVE TAMU BARU
document.getElementById("saveGuest").addEventListener("click", () => {
  const nama = document.getElementById("name").value.trim();
  const instansi = document.getElementById("company").value.trim();
  const kegiatan = document.getElementById("purpose").value;

  if (!nama || !instansi || !kegiatan)
    return showMessage("Lengkapi data", false);

  sendData({ nama, instansi, kegiatan });
});

// SAVE TAMU LAMA
document.getElementById("saveOldGuest").addEventListener("click", () => {
  const nama = document.getElementById("oldName").value;
  const instansi = document.getElementById("oldCompany").value;
  const kegiatan = document.getElementById("oldPurpose").value;

  if (!kegiatan) return showMessage("Pilih tujuan", false);

  sendData({ nama, instansi, kegiatan });
});

// SEND DATA
async function sendData(data) {
  try {
    showLoading("Mengirim data");

    const body = new URLSearchParams();
    body.append("nama", data.nama);
    body.append("instansi", data.instansi);
    body.append("kegiatan", data.kegiatan);

    const res = await fetch(API_URL, {
      method: "POST",
      body,
    });

    const text = await res.text();

    if (text === "OK") {
      showLoading("Menyiapkan kode antrean");

      await new Promise((r) => setTimeout(r, 2000));

      const antreanRes = await fetch(
        "https://script.google.com/macros/s/AKfycbw41s7GSGZrQ4CDKgptG6GAeIinybLc-_nFAJhsjjqAfbXB7uhAN7fN6xVMrva2DRot/exec"
      );

      const antreanJson = await antreanRes.json();

      let kodeAntrean = "-";

      if (antreanJson.status === "success" && antreanJson.data?.length) {
        kodeAntrean = antreanJson.data[antreanJson.data.length - 1].kodeantrean;
      }

      clearLoading();

      notification.innerHTML = `
          <div class="success">
            Kode antrean Anda adalah: <strong>${kodeAntrean}</strong>
          </div>
        `;

      setTimeout(() => {
        notification.innerHTML = "";
      }, 15000);

      resetForm();
    } else {
      clearLoading();

      notification.innerHTML = `
          <div class="error-message">Server error</div>
        `;
    }
  } catch (err) {
    console.error(err);
    clearLoading();

    notification.innerHTML = `
        <div class="error-message">Gagal mengirim data</div>
      `;
  }
}

// MESSAGE
function showMessage(text, status, duration = 3000) {
  notification.innerHTML = `
      <div class="${status ? "success" : "error-message"}">
        ${text}
      </div>
    `;

  setTimeout(() => {
    notification.innerHTML = "";
  }, duration);
}

// RESET
function resetForm() {
  document.querySelectorAll("input").forEach((x) => {
    if (x.type !== "radio") x.value = "";
  });

  document.querySelectorAll("select").forEach((x) => (x.selectedIndex = 0));

  newGuest.classList.add("hidden");
  returningGuest.classList.add("hidden");
  guestFound.classList.add("hidden");

  previewBox.innerHTML = "";

  document
    .querySelectorAll('input[name="statusTamu"]')
    .forEach((x) => (x.checked = false));
}

function showLoading(text = "Mengirim data") {
  notification.innerHTML = `
      <div class="loading">
        ${text}<span class="dots"></span>
      </div>
    `;

  animateDots();
}

let dotInterval;

function animateDots() {
  const dots = document.querySelector(".dots");
  if (!dots) return;

  let count = 0;

  clearInterval(dotInterval);
  dotInterval = setInterval(() => {
    count = (count + 1) % 4;
    dots.textContent = ".".repeat(count);
  }, 400);
}

function clearLoading() {
  clearInterval(dotInterval);
}
