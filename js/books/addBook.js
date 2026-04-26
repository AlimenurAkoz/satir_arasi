//kitap ekleme
// firebaseConfig.js dosyasından db nesnesini içe aktar
import { db, auth } from "../firebase/firebaseConfig.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

export async function saveBookToFirebase(book) {
    // 1. O an giriş yapmış kullanıcıyı kontrol et
    const user = auth.currentUser;

    if (!user) {
        alert("Kitap eklemek için lütfen önce giriş yapın!");
        return;
    }

    const info = book.volumeInfo;

    try {
        // 2. Veriyi "kullaniciKitapligi" koleksiyonuna, kullanıcının UID'si ile kaydet
        const docRef = await addDoc(collection(db, "kullaniciKitapligi"), {
            userId: user.uid,           
            userEmail: user.email,      
            googleBookId: book.id,      
            title: info.title,
            authors: info.authors || ["Bilinmeyen Yazar"],
            thumbnail: info.imageLinks?.thumbnail || "https://via.placeholder.com/128x192?text=No+Cover",
            addedAt: serverTimestamp()  
        });

        console.log("Kitap eklendi! ID:", docRef.id);
        alert(`${info.title} kitaplığına eklendi!`);
    } catch (error) {
        console.error("Kitap eklenirken bir hata oluştu:", error);
        alert("Kitap eklenemedi, lütfen tekrar deneyin.");
    }
}