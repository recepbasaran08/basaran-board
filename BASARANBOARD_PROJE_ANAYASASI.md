# BAŞARANBOARD — PROJE ANAYASASI
> Bu dosya, Claude Code'a (veya projeye yeni başlayan herhangi bir geliştiriciye/AI'a) tüm proje bağlamını vermek için hazırlanmıştır. Claude Code oturumuna başlarken bu dosyayı okumasını iste: "Önce BASARANBOARD_PROJE_ANAYASASI.md dosyasını oku, sonra devam edelim."

---

## 0. VİZYON

**BaşaranBoard**: Kami'ye ve Miro'ya taş çıkartacak, öğretmen kontrollü, ekran kilitlemeli, sıfır gecikmeli, sıfır şifreli dijital beyaz tahta / canlı ders platformu.

Hedef kitle: Birebir veya küçük grup dersi veren öğretmenler (özellikle ilkokul/ortaokul seviyesi).

Öne çıkan iki temel fark (rakiplerden ayıran özellikler):
1. **Öğrenci girişinde sıfır sürtünme**: Üyelik yok, şifre yok, indirme yok. Sadece link + isim + öğretmen onayı.
2. **Öğretmen Ekran Kilidi**: Öğretmen "Görünümü Kilitle" dediğinde öğrencinin ekranı öğretmenin baktığı yere birebir ve eş zamanlı kilitlenir; öğrenci kendi başına kaydıramaz/zoom yapamaz.

---

## 1. KULLANICI SENARYOLARI VE MVP KAPSAMI

### 1.1 Kullanıcı Rolleri ve Erişim Akışı
- **Öğretmen (Oda Sahibi)**: Giriş yapar, "Yeni Ders Başlat" der. Sistem benzersiz bir ders linki üretir. Öğretmen linki (WhatsApp vb.) öğrenciye iletir.
- **Öğrenci (Katılımcı)**: Üyelik/şifre/indirme yok. Linke tıklar, adını yazar, "Derse Katıl" der.
- **Kapı Onay Mekanizması (Lobi)**: Öğrenci linke tıklayınca doğrudan tahtaya giremez. Öğretmenin ekranına "Ali derse katılmak istiyor, onaylıyor musunuz?" bildirimi düşer. Öğretmen onaylayınca ders başlar.

### 1.2 MVP Çalışma Alanı ve Senkronizasyon Kapsamı
- **Altyapı Seçimi**: `tldraw` + `Yjs` tabanlı — vektörel akıcılık, tablet/kalem basınç hassasiyeti, sıfıra yakın gecikme.
- **Zemin Katmanı (Dinamik Canvas)**: Çalışma alanı statik bir PDF görüntüleyici değil, arka planı değişebilen esnek bir yapı. İlk sürümde desteklenecek zeminler:
  - Klasik Beyaz Tahta
  - Kareli Defter Sayfası
  - Matematiksel Koordinat Ekseni
  - PDF / Görsel (PNG, JPG) yükleme katmanı
- **Pedagojik Senkronizasyon (Öğretmen Ekran Kilidi)**: Öğretmen ekranında "Görünümü Kilitle" butonu. Aktifken öğretmen sayfayı kaydırdığında/zoom yaptığında öğrencinin ekranı da birebir aynı koordinata anlık kilitlenir. Öğrenci tuvali kendi başına çekiştiremez.
  - *Teknik not*: tldraw'da hazır gelmiyor, ayrı yazılması gerekiyor. Öğretmenin kamera/zoom durumu (`editor.setCamera` API'si) her değiştiğinde bu senkron kanalından öğrenciye yayınlanmalı, öğrenci tarafında `setCamera` ile kilitli takip ettirilmeli. Bu mesajların sık ve hafif olması "sıfır gecikme" hedefi için kritik.

### 1.3 Dosya Yükleme Sınırları (MVP)
- **PDF**: Tek seferde maksimum 30–40 sayfa.
- **Görseller (PNG/JPEG)**: Tek seferde maksimum 10 adet bağımsız görsel.
- **Dosya boyutu**: Tek bir PDF veya görsel grubu için maksimum 20–30 MB.
- *Gerekçe*: tldraw/Yjs mimarisinde her yüklenen sayfa bir dijital zemin objesine dönüşüyor; sayfa sayısı arttıkça senkronizasyon yükü artıp akıcılığı bozuyor.

### 1.4 Öğrenci Dosya Yükleme İzin Mekanizması
- Öğrenci ekranında da bir "Dosya Yükle" butonu var ama normalde **inaktif**.
- Öğrenci tıklarsa: "Dosya yüklemek için öğretmeninizden izin isteyin" uyarısı çıkar, öğretmene bildirim gider.
- Öğretmen ekranında: "Ali dosya yüklemek istiyor. [İzin Ver] [Reddet]" bildirimi.
- Öğretmen "İzin Ver" derse öğrencinin butonu geçici olarak aktifleşir, yükleme bitince otomatik tekrar kapanır.

---

## 2. ALET ÇANTASI (TOOLBAR) ÖZELLİK LİSTESİ

Ekranın sol dikey kısmında, ders hızını kesmeyecek sade bir araç listesi:
- 🖌️ **Kalem**: Doğal el yazısı akıcılığı. 3 sabit kalınlık, 4 renk (Siyah, Mavi, Kırmızı, Yeşil).
- 🧽 **Silgi**: Parça parça silme + tek tıkla "Tüm Sayfayı Temizle" (çift tıklamayla onay).
- 📐 **Zemin Seçici**: Tek tıkla arka plan değiştirme (Beyaz / Kareli / Koordinat).
- 📄 **Materyal Yükle**: PDF veya görsel aktarma.
- 🔁 **Sayfa Kontrolü**: PDF sayfaları arası basit yön okları (`< Sayfa 1/12 >`).
- **Seçim Aracı (Ok)**: Nesne seçip taşıma.

---

## 3. TEKNİK MİMARİ

### 3.1 Frontend
- **Ana çatı**: Vite + React (hafif, hızlı derlenen modern kurulum).
- **Çizim motoru**: `tldraw` — Apple Pencil / grafik tablet basınç hassasiyeti, vektörel akıcılık, açık kaynak ve ücretsiz.
- **PDF işleme**: `PDF.js` (Mozilla) — PDF sayfalarını tarayıcıda anlık render edip zemin olarak koyar.

### 3.2 Real-Time Senkronizasyon ve Veri Tabanı
- **Çizim eşitleme**: `Yjs (CRDT)` + bir senkron sağlayıcı.
  - *Önemli teknik not*: Yjs'in Supabase Realtime ile konuşması "kutudan çıkma" değil — aralarına bir "provider" katmanı yazılması/entegre edilmesi gerekiyor. **Alternatif olarak `Liveblocks`, tldraw ile resmi/hazır entegrasyona sahip** — MVP hızı için Yjs+Supabase yerine Liveblocks veya tldraw'ın kendi sync altyapısıyla başlamak daha az sürtünmeli olabilir. Bu karar netleşmedi, Claude Code ile başlarken tekrar değerlendirilmeli.
- **Depolama/Oturum yönetimi**: `Supabase` (ücretsiz paket) — PDF dosyaları ve ders odası verileri için.

### 3.3 Geliştirme ve Dağıtım
- **Lokal geliştirme**: VS Code + Node.js, `localhost:3000` üzerinden test.
- **İnternete açma**: Vercel veya Netlify — ücretsiz, tek tıkla deploy (`basaranboard.vercel.app` gibi bir link).

---

## 4. EKRAN TASARIMLARI (WIREFRAME)

### 4.1 Giriş / Karşılama Ekranı (Lobi)
- **Öğretmen**: Ortada büyük "BaşaranBoard — Yeni Ders Başlat" butonu → tıklanınca ders paneline geçer, sağ üstte "Öğrenci Linki: [Kopyala]" kutucuğu belirir.
- **Öğrenci**: Boş kutu "Adını Yaz: [___]" + "Derse Katıl" butonu → basınca "Öğretmenin onay vermesi bekleniyor..." ekranı.
- **Öğretmen onay bildirimi**: "Ali derse katılmak istiyor. [Reddet] [Onayla]".

### 4.2 Ana Çalışma Alanı Layout (Öğretmen)
Ekran 3 bölgeye ayrılır:

**A. Sol Sabit Dikey Araç Çubuğu**
- Seçim Aracı (Ok)
- Kalem (üzerine gelince renk/kalınlık paneli açılır)
- Silgi (çift tıkla → "Tüm Sayfayı Temizle")
- Zemin Seçici (Izgara ikonu)
- Dosya Yükle (Ataş ikonu)

**B. Orta Devasa Alan (Tuval / Canvas)**
- PDF veya seçilen zemin burada.
- **"Görünümü Kilitle" butonu (alt orta)**: Aktifken kırmızı renge döner, öğrencinin ekranını öğretmenle senkron kilitler.

**C. Üst Bar**
- Sol üst: Logo + oda durumu ("Öğrenci: Ali Bağlandı - Canlı")
- Sağ üst: Sayfa kontrolü `[ < ] Sayfa 01/12 [ > ]`

### 4.3 Öğrenci Arayüzü (Kısıtlanmış Mod)
- Öğretmeninkiyle neredeyse birebir aynı, ama:
  - "Dosya Yükle" ve "Görünümü Kilitle" butonları **gizli** (kontrol öğretmende).
  - Ekran kilitliyken öğrenci tuvali kaydıramaz/zoom yapamaz, sadece kalemle yazabilir.
  - Dosya yükleme butonu normalde inaktif (bkz. 1.4).

---

## 5. YOL HARİTASI (ORİJİNAL PLAN)

> Not: Bu takvim iyimser bir hedef olarak düşünülmeli, sıfırdan öğrenerek ilerleniyorsa esneyebilir.

- **Hafta 1 — İskeletin Kurulması**: Node.js/VS Code kurulumu, Vite+React projesi, localhost:3000'de boş sayfa, sol araç çubuğunun görsel yerleşimi.
- **Hafta 2 — Çizim Motoru ve Zeminler**: tldraw entegrasyonu, zemin seçici işlevselliği, PDF/görsel yükleme altyapısı.
- **Hafta 3 — Real-Time ve Canlı Ders Denemesi**: Supabase (veya Liveblocks) entegrasyonu, iki sekme arası canlı senkron testi, Vercel'e deploy.

---

## 6. ŞU ANA KADAR YAPILANLAR (MEVCUT DURUM)

- Node.js ve VS Code kuruldu.
- `basaran-board` adlı proje klasörü masaüstünde oluşturuldu.
- **DİKKAT — TEKNİK BORÇ**: Şu ana kadar yazılan kod, hedeflenen mimariyle (Vite+React+tldraw) uyumlu DEĞİL. Şu an elde:
  - `index.js`: Node'un ham `http` modülüyle yazılmış basit bir statik dosya sunucusu (Express bile değil).
  - `public/index.html`: Düz HTML/CSS, tek bir "Yeni Ders Başlat" butonu olan statik bir sayfa (React değil).
- Bu yapı sadece "localhost:3000'de bir şey çalışıyor" testi için iyiydi, ama tldraw/React'e geçerken **muhtemelen sıfırdan proje kurulması gerekecek** (`npm create vite@latest`).

### Claude Code'a önerilen ilk görev:
1. Mevcut `basaran-board` klasörünü incele.
2. Projeyi Vite + React ile temiz bir şekilde yeniden kur (mevcut ham `index.js`/`public/index.html` yapısını koru ama gerçek React proje yapısına geçir).
3. `tldraw` paketini kur ve canvas'ı ekrana bas (Hafta 2 hedefi).
4. Sync altyapısı için Liveblocks mi yoksa Yjs+Supabase mi kullanılacağına birlikte karar ver (bkz. 3.2).

---

## 7. KONUŞMA TONU / STİL NOTU
Proje sahibi ile önceki sohbetlerde samimi, motive edici, "dostum/panpa" tarzı bir dil kullanıldı. Bu bir tercih meselesi — Claude Code'da bu tonun devam etmesi gerekmiyor, ama proje sahibinin teknik geçmişi olmadığını (ilk kez Node.js/VS Code kuran biri) unutmamak, adımları basit ve net anlatmak önemli.

---

*Bu dosya, projenin önceki Gemini + Claude sohbetlerinden derlenmiştir. Güncel kalması için proje ilerledikçe elle güncellenmesi önerilir.*
