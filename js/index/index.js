import { auth } from '../firebase/firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const popularBooksContainer = document.getElementById('popularBooksContainer');
    const navRight = document.querySelector('.nav-right');
    const ctaButton = document.querySelector('.cta-area .btn-primary');

    // --- 1. KULLANICI DURUMU KONTROLÜ ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            if (navRight) {
                navRight.innerHTML = `
                    <a href="dashboard.html" class="btn-login-nav">
                        <i class="fas fa-columns"></i> Paneli Gör
                    </a>
                `;
            }
            if (ctaButton) {
                ctaButton.innerText = "Okumaya Devam Et";
                ctaButton.href = "dashboard.html";
            }
        }
    });

    // --- 2. POPÜLER KİTAPLARI ÇEKME ---
    async function fetchPopularBooks() {
        if (!popularBooksContainer) return;

        try {
            // Rusça kitapları engellemek için daha spesifik ve Türkçe odaklı bir sorgu
            const query = 'subject:turkish_literature+fiction+roman';
            const response = await fetch(
                `https://openlibrary.org/search.json?q=${query}&limit=100`
            );

            if (!response.ok) throw new Error("Ağ hatası oluştu.");

            const data = await response.json();
            // Open Library verisi 'docs' içinde gelir
            let items = data.docs || [];
            const forbiddenKeywords = [
                'yıllığı', 'ansiklopedisi', 'sözlüğü', 'araştırmaları', 'eğitim',
                'ders', 'tez', 'makale', 'incelemesi', 'kılavuzu', 'rapor'
            ];

            // Senin orijinal filtreleme mantığını koruyoruz
            const filteredBooks = items.filter(doc => {
                const title = doc.title?.toLowerCase() || "";
                // Kapak resmi ID'si (cover_i) olmayanları ve sıkıcı kelimeleri eliyoruz
                const hasCover = doc.cover_i;
                const isBoring = forbiddenKeywords.some(word => title.includes(word));

                // Sadece Latin alfabesi ve Türkçe/İngilizce ağırlıklı sonuçlar için basit bir kontrol
                const isLatin = /^[A-Za-z0-9\s\u00C0-\u017F]+$/.test(doc.title?.substring(0, 5));

                return hasCover && !isBoring && isLatin;
            }).map(doc => {
                // VERİ DÖNÜŞTÜRME: Open Library verisini senin 'render' fonksiyonunun 
                // beklediği 'volumeInfo' yapısına birebir sokuyoruz.
                return {
                    volumeInfo: {
                        title: doc.title,
                        authors: doc.author_name || ["Bilinmeyen Yazar"],
                        imageLinks: {
                            thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                        }
                    }
                };
            });

            // Senin orijinal "rastgele 3 tane seç" mantığın
            const selected = filteredBooks.sort(() => 0.5 - Math.random()).slice(0, 3);

            if (selected.length > 0) {
                // Format artık 'volumeInfo' içerdiği için render fonksiyonun 3 kitabı da tanıyacaktır
                renderPopularBooks(selected);
            } else {
                popularBooksContainer.innerHTML = '<p style="color:white;">Kitaplar şu an hazır değil.</p>';
            }
        } catch (error) {
            console.error("Popüler kitaplar çekilemedi:", error);
            popularBooksContainer.innerHTML = '<p style="color:white;">Bağlantı hatası.</p>';
        }
    }

    function renderPopularBooks(books) {
        popularBooksContainer.innerHTML = books.map(item => {
            const info = item.volumeInfo;
            const bookId = item.id; // Google Books'un verdiği benzersiz ID

            const thumbnail = info.imageLinks?.thumbnail
                ? info.imageLinks.thumbnail.replace('http:', 'https:').replace('&zoom=1', '&zoom=2')
                : 'https://via.placeholder.com/180x270';

            const safeTitle = info.title.length > 35 ? info.title.substring(0, 35) + '...' : info.title;

            // Yönlendirmeyi book-detail.html sayfasına ve id parametresine çevirdim
            return `
            <div class="book-card" onclick="window.location.href='book-detail.html?id=${bookId}'" style="cursor: pointer;">
                <div class="book-img">
                    <img src="${thumbnail}" alt="${safeTitle}">
                </div>
                <h4 style="color:white; margin-top:15px; font-size:1rem; max-width:180px;">${safeTitle}</h4>
            </div>
        `;
        }).join('');
    }
    // --- 3. ARAMA MANTIĞI ---
    const mainSearchBtn = document.getElementById('mainSearchBtn');
    const mainSearchInput = document.getElementById('mainSearchInput');

    if (mainSearchBtn && mainSearchInput) {
        const handleSearch = () => {
            const query = mainSearchInput.value.trim();
            if (query !== "") {
                window.location.href = `library.html?search=${encodeURIComponent(query)}`;
            } else {
                alert("Lütfen bir kitap adı girin.");
            }
        };

        mainSearchBtn.addEventListener('click', handleSearch);
        mainSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    fetchPopularBooks();

    // --- 4. YUKARI ÇIK BUTONU MANTIĞI ---
    const scrollTopBtn = document.getElementById('scrollTopBtn');

    // Sayfa aşağı kaydırıldığında butonu göster, yukarıdaysa gizle
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            scrollTopBtn.style.display = "block";
        } else {
            scrollTopBtn.style.display = "none";
        }
    });

    // Butona tıklandığında yumuşak bir geçişle yukarı çık
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});