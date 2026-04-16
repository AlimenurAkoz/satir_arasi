import { auth, db } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const booksContainer = document.getElementById('userBooksContainer');
    const readingNowContainer = document.querySelector('.reading-now');

    const searchInput = document.getElementById('librarySearchInput');
    const sortSelect = document.querySelector('.sort-select');

    const goalYearSelect = document.getElementById('goalYearSelect');
    const yearlyGoalInput = document.getElementById('yearlyGoalInput');
    const saveGoalBtn = document.getElementById('saveGoalBtn');

    let userBooks = []; // Artık boş, Firebase'den dolacak!
    let userGoals = JSON.parse(localStorage.getItem('myUserGoals')) || { "2026": 8, "2025": 12, "2024": 15 };
    let currentActiveTab = 'Tümü';

    // --- KULLANICI GİRİŞ KONTROLÜ VE VERİ ÇEKME ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (booksContainer) booksContainer.innerHTML = '<p style="text-align:center; width:100%; color:#777; padding:40px;">Kütüphaneniz yükleniyor <i class="fa-solid fa-spinner fa-spin"></i></p>';

            try {
                // Kullanıcının kütüphanesini Firebase'den çek
                const libraryRef = collection(db, "users", user.uid, "library");
                const querySnapshot = await getDocs(libraryRef);

                // Gelen verileri userBooks dizisine doldur
                userBooks = querySnapshot.docs.map(doc => doc.data());

                // Her şey hazır, ekrana bas!
                renderBooks('Tümü');
                updateDashboard();
                renderGoal();

            } catch (error) {
                console.error("Kitaplar çekilirken hata oluştu:", error);
                if (booksContainer) booksContainer.innerHTML = '<p style="text-align:center; color:#c0392b; padding:40px;">Veriler alınırken bir hata oluştu.</p>';
            }
        } else {
            // Çıkış yapılmışsa login'e gönder
            window.location.href = 'login.html';
        }
    });

    // --- KİTAPLARI LİSTELEME VE FİLTRELEME ---
    function renderBooks(filter = currentActiveTab) {
        currentActiveTab = filter;
        if (!booksContainer) return;
        booksContainer.innerHTML = '';

        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        let filtered = userBooks.filter(b => {
            const matchesStatus = filter === 'Tümü' || b.status === filter;
            const title = b.title ? b.title.toLowerCase() : "";
            const author = b.author ? b.author.toLowerCase() : "";
            const matchesSearch = title.includes(searchTerm) || author.includes(searchTerm);
            return matchesStatus && matchesSearch;
        });

        if (sortSelect && sortSelect.value === "En Yüksek Puanlılar") {
            filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else {
            // En yeniler (Kayıt tarihi vs olmadığı için şimdilik ID uzunluklarına vb. bakılır, ama genel sıralama yeterli)
            filtered.reverse();
        }

        if (filtered.length === 0) {
            booksContainer.innerHTML = `<p style="text-align:center; width:100%; color:#777; padding:40px;">Aradığınız kriterlere uygun kitap bulunamadı veya henüz kitap eklemediniz.</p>`;
            return;
        }

        filtered.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'glass-card book-card';
            bookCard.style.cursor = 'pointer';

            bookCard.onclick = () => {
                window.location.href = `book-detail.html?id=${book.id}`;
            };

            const safeTitle = book.title ? book.title.replace(/"/g, '&quot;') : "Bilinmeyen";

            bookCard.innerHTML = `
                <img src="${book.cover || 'img/default-book.jpg'}" alt="${safeTitle}" style="width: 100px; height: 145px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); margin-bottom: 10px;">
                <h4 style="margin:5px 0; color:#333; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${book.title}</h4>
                <p style="font-size:0.8rem; color:#666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${book.author}</p>
                <span style="font-size:0.7rem; background:#4a6b6f; color:white; padding:3px 10px; border-radius:12px; margin-top:8px; display:inline-block;">${book.status}</span>
            `;
            booksContainer.appendChild(bookCard);
        });
    }

    // --- DASHBOARD (ŞU AN OKUDUKLARIM) GÜNCELLEME ---
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
                let progressPercentage = 0;
                if (book.totalPages && book.totalPages > 0) {
                    progressPercentage = Math.round(((book.currentPage || 0) / book.totalPages) * 100);
                }
                progressPercentage = progressPercentage > 100 ? 100 : progressPercentage;

                const safeTitle = book.title ? book.title.replace(/"/g, '&quot;') : "Bilinmeyen";

                gridContainer.innerHTML += `
                    <div class="reading-card">
                        <div class="reading-card-icon" style="background: transparent; box-shadow: none;">
                            <img src="${book.cover || 'img/default-book.jpg'}" alt="${safeTitle}" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                        </div>
                        <div class="reading-info">
                            <h4 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${book.title}</h4>
                            <p style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${book.author}</p>
                            <div class="progress-track">
                                <div class="progress-fill" style="width: ${progressPercentage}%;"></div>
                            </div>
                            <div class="progress-text">%${progressPercentage} tamamlandı</div>
                            <button class="btn-continue" onclick="window.location.href='book-detail.html?id=${book.id}'">Devam Et</button>
                        </div>
                    </div>
                `;
            });
            readingNowContainer.appendChild(gridContainer);
        }
    }

    // --- YILLARA GÖRE OKUMA HEDEFİ HESAPLAMA ---
    function renderGoal() {
        if (!goalYearSelect) return;
        const selectedYear = goalYearSelect.value;
        const currentGoal = userGoals[selectedYear] || 8;

        const booksInYear = userBooks.filter(b =>
            b.status === "Okuduklarım" &&
            (b.readYear === selectedYear || (!b.readYear && selectedYear === "2026"))
        );

        const totalRead = booksInYear.length;
        let goalProgress = Math.round((totalRead / currentGoal) * 100);
        goalProgress = goalProgress > 100 ? 100 : goalProgress;

        if (document.getElementById('goalProgressText')) document.getElementById('goalProgressText').innerText = `%${goalProgress}`;
        if (document.getElementById('goalFraction')) document.getElementById('goalFraction').innerText = `${totalRead} / ${currentGoal}`;
        if (yearlyGoalInput) yearlyGoalInput.value = currentGoal;
    }

    // --- ETKİLEŞİMLER (Event Listeners) ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderBooks(btn.innerText.trim());
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', () => renderBooks(currentActiveTab));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => renderBooks(currentActiveTab));
    }

    if (goalYearSelect) {
        goalYearSelect.addEventListener('change', renderGoal);
    }

    if (saveGoalBtn) {
        saveGoalBtn.addEventListener('click', () => {
            const newGoal = parseInt(yearlyGoalInput.value);
            if (newGoal > 0) {
                userGoals[goalYearSelect.value] = newGoal;
                localStorage.setItem('myUserGoals', JSON.stringify(userGoals));
                renderGoal();

                const originalText = saveGoalBtn.innerText;
                saveGoalBtn.innerText = "✓";
                saveGoalBtn.style.background = "#2ecc71";
                setTimeout(() => {
                    saveGoalBtn.innerText = originalText;
                    saveGoalBtn.style.background = "#4a6b6f";
                }, 1000);
            }
        });
    }

    // mylibrary.js içine eklenebilir
    async function deleteBook(bookId) {
        if (confirm("Bu kitabı kitaplığından silmek istediğine emin misin?")) {
            try {
                const user = auth.currentUser;
                await deleteDoc(doc(db, "users", user.uid, "library", bookId));
                alert("Kitap silindi.");
                location.reload(); // Sayfayı yenileyerek listeyi güncelle
            } catch (error) {
                console.error("Silme hatası:", error);
            }
        }
    }
});