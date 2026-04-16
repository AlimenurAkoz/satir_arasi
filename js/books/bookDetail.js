import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { db, auth } from "../firebase/firebaseConfig.js";

const authRequiredStatus = document.getElementById('authRequiredStatus');
const reviewSection = document.getElementById('reviewSection');

// --- 1. URL'DEN DINAMIK ID ALMA ---
const urlParams = new URLSearchParams(window.location.search);
// URL'de 'id' yoksa bile sayfanın boş kalmaması için varsayılan bir ID (Satranç) tutuyoruz
const currentBookId = urlParams.get('id') || urlParams.get('bookId') || "v3Z7DwAAQBAJ";

// --- 2. GOOGLE BOOKS API'DEN SEÇİLEN KİTABI ÇEK ---
async function fetchBookFromAPI() {
    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${currentBookId}`);
        
        if (!response.ok) {
            if(response.status === 429) {
                console.log("API kotası doldu, lütfen biraz bekleyin.");
            }
            return;
        }

        const data = await response.json();
        const info = data.volumeInfo;
        if (!info) return;

        // Kapak Resmi Kontrolü
        let coverImg = 'img/default-book.jpg';
        if (info.imageLinks) {
            coverImg = info.imageLinks.medium || info.imageLinks.large || info.imageLinks.thumbnail;
            coverImg = coverImg.replace('http:', 'https:');
        }

        // HTML Elemanlarını API Verileriyle Güncelle
        document.getElementById('bookCover').src = coverImg;
        document.getElementById('bookTitle').innerText = info.title || "İsimsiz Kitap";
        document.getElementById('bookAuthor').innerText = info.authors ? info.authors.join(', ') : "Bilinmeyen Yazar";
        document.getElementById('bookDescription').innerHTML = info.description || "Bu kitap için henüz bir özet bulunmuyor.";
        
        // Eğer kitaplıkta kayıtlı değilse, API'den gelen toplam sayfa sayısını inputa yaz
        const totalPagesInput = document.getElementById('totalPages');
        if(totalPagesInput && info.pageCount) {
            totalPagesInput.value = info.pageCount;
        }
    } catch (error) {
        console.error("Kitap bilgileri çekilirken hata oluştu:", error);
    }
}

// Sayfa yüklenince API isteğini başlat
fetchBookFromAPI();

// --- 3. KULLANICI DURUMU VE FIREBASE ENTEGRASYONU ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        initializeInteractiveFeatures(user);
    } else {
        // Giriş yapılmamışsa kısıtlamaları göster
        if (authRequiredStatus) authRequiredStatus.style.display = 'none';
        if (reviewSection) {
            reviewSection.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.6); border-radius: 20px; border: 2px dashed rgba(74, 107, 111, 0.4);">
                    <i class="fa-solid fa-lock" style="font-size: 3.5rem; color: #4a6b6f; margin-bottom: 20px;"></i>
                    <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.5rem;">Sadece Üyelere Özel</h3>
                    <p style="color: #444; line-height: 1.6; margin-bottom: 25px; font-size: 1.05rem;">Kitap eklemek ve not almak için giriş yapın.</p>
                    <a href="login.html" class="btn-primary" style="text-decoration: none; display: inline-block; padding: 15px 35px; width: auto;">Giriş Yap</a>
                </div>
            `;
        }
    }
});

async function initializeInteractiveFeatures(user) {
    const stars = document.querySelectorAll('#starRating span');
    const statusSelect = document.getElementById('readingStatus');
    const userNote = document.getElementById('userNote');
    const charCounter = document.getElementById('charCounter');
    const saveButton = document.getElementById('saveReviewBtn');
    
    const pageTracker = document.getElementById('pageTracker');
    const currentPageInput = document.getElementById('currentPage');
    const totalPagesInput = document.getElementById('totalPages');
    
    let currentRating = 0; 

    // Firebase'den bu kullanıcıya ait bu kitabın verisi var mı bak
    try {
        const bookRef = doc(db, "users", user.uid, "library", currentBookId);
        const bookSnap = await getDoc(bookRef);

        if (bookSnap.exists()) {
            const currentBook = bookSnap.data();
            
            // Okuma durumunu yükle
            if (currentBook.status === "Okunuyor") statusSelect.value = "okunuyor";
            else if (currentBook.status === "Okuduklarım") statusSelect.value = "okudum";
            else statusSelect.value = "okunacak";
            
            if (currentPageInput) currentPageInput.value = currentBook.currentPage || '';
            if (currentBook.totalPages) totalPagesInput.value = currentBook.totalPages;
            if (userNote) userNote.value = currentBook.note || '';
            
            currentRating = currentBook.rating || 0;
            stars.forEach((s, i) => {
                s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)";
            });
        }
    } catch (e) { console.error("Firebase Hatası:", e); }

    // Görsel kontroller ve yıldız puanlama mantığı aynı kalacak
    function checkRatingStatus() {
        if (statusSelect.value === "okunacak") {
            currentRating = 0; 
            stars.forEach(s => s.style.filter = "grayscale(100%)");
            document.getElementById('starRating').style.opacity = "0.4";
            document.getElementById('starRating').style.pointerEvents = "none";
            if (pageTracker) pageTracker.style.display = "none";
        } else {
            document.getElementById('starRating').style.opacity = "1";
            document.getElementById('starRating').style.pointerEvents = "auto";
            if (pageTracker) pageTracker.style.display = "block";
            if (statusSelect.value === "okudum" && totalPagesInput.value) {
                currentPageInput.value = totalPagesInput.value;
            }
        }
    }

    statusSelect.addEventListener('change', checkRatingStatus);
    checkRatingStatus();

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1; 
            stars.forEach((s, i) => {
                s.style.filter = (i < currentRating) ? "grayscale(0%)" : "grayscale(100%)";
            });
        });
    });

    if (userNote && charCounter) {
        userNote.addEventListener('input', function() {
            charCounter.textContent = `${this.value.length} / 2000`;
        });
    }

    // --- 4. KAYDETME BUTONU (DINAMIK VERIYI FIREBASE'E YAZAR) ---
    saveButton.addEventListener('click', async () => {
        if (statusSelect.value !== "okunacak" && currentRating === 0) {
            alert("Lütfen bir puan seçin.");
            return;
        }

        const libraryStatus = statusSelect.value === "okunuyor" ? "Okunuyor" : 
                             statusSelect.value === "okudum" ? "Okuduklarım" : "Okunacaklar";

        saveButton.innerText = "Kaydediliyor...";
        saveButton.disabled = true;

        try {
            const bookRef = doc(db, "users", user.uid, "library", currentBookId); 
            
            await setDoc(bookRef, {
                id: currentBookId,
                title: document.getElementById('bookTitle').innerText,
                author: document.getElementById('bookAuthor').innerText,
                cover: document.getElementById('bookCover').src,
                status: libraryStatus,
                rating: currentRating,
                note: userNote.value,
                currentPage: parseInt(currentPageInput.value) || 0,
                totalPages: parseInt(totalPagesInput.value) || 1,
                readYear: new Date().getFullYear().toString()
            }, { merge: true });

            alert("Kitaplığın güncellendi!");
            window.location.href = "my-library.html"; 
        } catch (error) {
            alert("Hata oluştu!");
            saveButton.innerText = "Kaydet";
            saveButton.disabled = false;
        }
    });
}