import { auth, db } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const booksContainer = document.getElementById('userBooksContainer');
    const readingNowContainer = document.querySelector('.reading-now');

    const searchInput = document.getElementById('librarySearchInput');
    const sortSelect = document.querySelector('.sort-select');

    const goalYearSelect = document.getElementById('goalYearSelect');
    const yearlyGoalInput = document.getElementById('yearlyGoalInput');
    const saveGoalBtn = document.getElementById('saveGoalBtn');

    let userBooks = [];
    let userGoals = {};
    let currentActiveTab = 'Tümü';

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Firestore'dan kullanıcı verisini çek
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            // Eğer veritabanında okuma hedefi varsa onu al, yoksa 0 ata
            const userData = userSnap.exists() ? userSnap.data() : {};
            userGoals = userData.readingGoals || { "2026": 0 };

            if (booksContainer) booksContainer.innerHTML = '<p style="text-align:center; width:100%; color:#777; padding:40px;">Kütüphaneniz yükleniyor <i class="fa-solid fa-spinner fa-spin"></i></p>';

            try {
                const libraryRef = collection(db, "users", user.uid, "library");
                const querySnapshot = await getDocs(libraryRef);
                userBooks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                renderBooks('Tümü');
                updateDashboard();
                renderGoal(); // Global userGoals değişkenini kullanır
            } catch (error) {
                console.error("Kitaplar çekilirken hata:", error);
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    function renderBooks(filter = currentActiveTab) {
        currentActiveTab = filter;
        if (!booksContainer) return;
        booksContainer.innerHTML = '';

        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // 1. FİLTRELEME
        let filtered = userBooks.filter(b => {
            const matchesStatus = filter === 'Tümü' || b.status === filter;
            const title = b.title ? b.title.toLowerCase() : "";
            const author = b.author ? b.author.toLowerCase() : "";
            const matchesSearch = title.includes(searchTerm) || author.includes(searchTerm);
            return matchesStatus && matchesSearch;
        });

        // 2. SIRALAMA MANTIĞI (DÜZELTİLDİ)
        if (sortSelect) {
            if (sortSelect.value === "rating" || sortSelect.value === "En Yüksek Puanlılar") {
                // Sayısal karşılaştırma yaparak puanları sıralıyoruz
                filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
            } else {
                // En Yeniler: Firebase'den gelen sırayı ters çevirip son ekleneni başa alırız
                filtered.reverse();
            }
        }

        if (filtered.length === 0) {
            booksContainer.innerHTML = `<p style="text-align:center; width:100%; color:#777; padding:40px;">Aradığınız kriterlere uygun kitap bulunamadı.</p>`;
            return;
        }

        // 3. EKRANA BASMA
        filtered.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'glass-card book-card';
            bookCard.style.cursor = 'pointer';
            bookCard.onclick = () => window.location.href = `book-detail.html?id=${book.id}`;
            const safeTitle = book.title ? book.title.replace(/"/g, '&quot;') : "Bilinmeyen";

            bookCard.innerHTML = `
                <img src="${book.cover || 'img/default-book.jpg'}" alt="${safeTitle}" style="width: 100px; height: 145px; object-fit: cover; border-radius: 8px;">
                <h4 style="margin:5px 0; color:#333; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${book.title || "İsimsiz"}</h4>
                <p style="font-size:0.8rem; color:#666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${book.author || "Bilinmeyen"}</p>
                <span style="font-size:0.7rem; background:#4a6b6f; color:white; padding:3px 10px; border-radius:12px; margin-top:8px; display:inline-block;">${book.status}</span>
            `;
            booksContainer.appendChild(bookCard);
        });
    }

    function updateDashboard() {
        if (!readingNowContainer) return;
        const readingNowBooks = userBooks.filter(b => b.status === "Okunuyor");

        const h3 = readingNowContainer.querySelector('h3');
        readingNowContainer.innerHTML = '';
        if (h3) readingNowContainer.appendChild(h3);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'reading-now-grid';

        if (readingNowBooks.length === 0) {
            readingNowContainer.innerHTML += `<p style="text-align:center; color:#777; padding:20px;">Şu an okuduğunuz bir kitap yok.</p>`;
        } else {
            readingNowBooks.forEach(book => {
                let progress = 0;
                if (book.totalPages && book.totalPages > 0) {
                    progress = Math.round(((book.currentPage || 0) / book.totalPages) * 100);
                }
                progress = progress > 100 ? 100 : progress;

                // GÖRSEL KAYMASINI ENGELLEYEN STYLE DÜZENLEMESİ
                gridContainer.innerHTML += `
                    <div class="reading-card" style="display: flex; gap: 15px; background: rgba(255, 255, 255, 0.4); padding: 15px; border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.5); align-items: center; margin-bottom: 10px;">
                        <div class="reading-card-icon" style="width: 80px; height: 120px; flex-shrink: 0; overflow: hidden; border-radius: 8px;">
                            <img src="${book.cover || 'img/default-book.jpg'}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <div class="reading-info" style="flex: 1; min-width: 0;">
                            <h4 style="margin: 0; color: #2c3e50; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${book.title}</h4>
                            <p style="margin: 3px 0; color: #555; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${book.author}</p>
                            <div class="progress-track" style="width: 100%; height: 6px; background: rgba(74, 107, 111, 0.2); border-radius: 10px; margin: 8px 0;">
                                <div class="progress-fill" style="width: ${progress}%; height: 100%; background: #4a6b6f;"></div>
                            </div>
                            <div class="progress-text" style="font-size: 0.8rem; color: #333;">%${progress} tamamlandı</div>
                            <button class="btn-continue" style="margin-top: 10px; background: #4a6b6f; color: white; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer;" onclick="window.location.href='book-detail.html?id=${book.id}'">Devam Et</button>
                        </div>
                    </div>
                `;
            });
            readingNowContainer.appendChild(gridContainer);
        }
    }

    // --- YILLARA GÖRE OKUMA HEDEFİ (2026 SABİT) ---
    function renderGoal() {
        const currentYear = "2026"; // Artık select'ten değil, sabit alıyoruz
        const currentGoal = userGoals[currentYear] || 0;

        // Sadece 2026 yılında okunanları filtrele (readYear boşsa da 2026 sayabiliriz)
        const booksInYear = userBooks.filter(b =>
            b.status === "Okuduklarım" &&
            (b.readYear === currentYear || !b.readYear)
        );

        const totalRead = booksInYear.length;
        let goalProgress = Math.round((totalRead / currentGoal) * 100);
        goalProgress = goalProgress > 100 ? 100 : (isNaN(goalProgress) ? 0 : goalProgress);

        if (document.getElementById('goalProgressText')) document.getElementById('goalProgressText').innerText = `%${goalProgress}`;
        if (document.getElementById('goalFraction')) document.getElementById('goalFraction').innerText = `${totalRead} / ${currentGoal}`;
        if (yearlyGoalInput) yearlyGoalInput.value = currentGoal;

        const progressCircle = document.querySelector('.circular-progress');
        if (progressCircle) {
            const degree = (goalProgress / 100) * 360;
            progressCircle.style.background = `conic-gradient(#4a6b6f ${degree}deg, #e0e0e0 0deg)`;;
        }
    }


    // Kaydet butonunu güncelle
    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', async () => {
            if (!auth.currentUser) return;
            const newGoal = parseInt(yearlyGoalInput.value) || 0;

            try {
                const userRef = doc(db, "users", auth.currentUser.uid);
                // Firestore'da iç içe alan (nested field) güncelleme
                await updateDoc(userRef, {
                    "readingGoals.2026": newGoal
                });

                // Global değişkeni de güncelle ki arayüz hemen değişsin
                userGoals["2026"] = newGoal;
                renderGoal();

                alert("Hedefiniz başarıyla güncellendi!");
                window.location.reload(); // Sayfayı yeniler
            } catch (e) {
                console.error("Kaydetme hatası:", e);
                alert("Hedef kaydedilemedi.");
            }
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBooks(btn.innerText.trim());
        });
    });

    if (searchInput) searchInput.addEventListener('input', () => renderBooks(currentActiveTab));
    if (sortSelect) sortSelect.addEventListener('change', () => renderBooks(currentActiveTab));
    if (goalYearSelect) goalYearSelect.addEventListener('change', renderGoal);

});