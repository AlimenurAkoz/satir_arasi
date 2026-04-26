//kitap listeleme

const searchBooks = async (query) => {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`);
    const data = await response.json();
    
    if (data.items) {
        displayBooks(data.items); // Gelen kitapları ekrana basacak fonksiyon
    } else {
        console.log("Kitap bulunamadı.");
    }
};

const displayBooks = (books) => {
    const container = document.getElementById('books-container'); // HTML'de bu id'li bir div olmalı
    container.innerHTML = ''; // Önceki aramaları temizle

    books.forEach(book => {
        const info = book.volumeInfo;
        const bookCard = `
            <div class="book-card">
                <img src="${info.imageLinks?.thumbnail || 'default-cover.jpg'}" alt="${info.title}">
                <h3>${info.title}</h3>
                <p>${info.authors ? info.authors.join(', ') : 'Bilinmeyen Yazar'}</p>
                <button onclick="addToMyLibrary('${book.id}')">Kitaplığıma Ekle</button>
            </div>
        `;
        container.innerHTML += bookCard;
    });
};