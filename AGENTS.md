# AGENTS.md

BaşaranBoard için geliştirici/agent rehberi. Ürün vizyonu ve kapsam için [BASARANBOARD_PROJE_ANAYASASI.md](BASARANBOARD_PROJE_ANAYASASI.md) dosyasına bak — burada sadece **kod mimarisi** var.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Vite dev server, `localhost:5173` |
| `npm run build` | Production build (`dist/`) |
| `npm run lint` | oxlint |
| `npm run preview` | Production build'i lokal önizle |
| `npm run sync-server` | Lokal Node.js senkron sunucusu (`ws://localhost:5858`) — Cloudflare Worker'ın offline yedeği |
| `npm run worker:dev` | Cloudflare Worker'ı lokalde çalıştır (wrangler dev) |
| `npm run worker:deploy` | Worker'ı Cloudflare'a deploy et (wrangler deploy) |

Otomatik test paketi yok. Değişiklikleri iki tarayıcı sekmesi/cihazı ile (öğretmen + öğrenci rolü) manuel doğrula — özellikle gerçek zamanlı senkron içeren değişiklikleri, tek sekmeden değil.

## Ortam değişkenleri

`.env.local` (gitignored, ayrıca Vercel dashboard'da da tanımlı):
- `VITE_SYNC_SERVER_URL` — senkron/lobi WebSocket'inin base URL'i. Boşsa `src/lib/syncConfig.js` içinde `ws://localhost:5858`'e düşer. Şu an production Cloudflare Worker'a işaret ediyor — yani lokal `npm run dev` da gerçek production backend'ine bağlanıyor (bilerek, `npm run sync-server` + değişken override'ı olmadan).
- `VITE_TLDRAW_LICENSE_KEY` — **kritik**. `Whiteboard.jsx`'teki `<Tldraw>` bileşenine geçiriliyor. Bu olmadan tldraw `localhost` dışındaki her domain'de (Vercel dahil) sessizce boş ekran render eder — hata mesajı sadece konsolda görünür. Bu satırı asla silme; bir gün yanlışlıkla bir `git revert` ile silinmiş ve production'ı kırmıştı.

## Mimari

### Rotalar ve rol ayrımı
`App.jsx`: `/` → `TeacherLobby` (ders başlat), `/ders/:roomId` → `TeacherRoom`, `/katil/:roomId` → `StudentJoin`. Öğretmen ve öğrenci **aynı** `Whiteboard.jsx` bileşenini kullanır; rol farkları component ağacı ayrımıyla değil, prop'larla ifade edilir (`restricted`, `roomStatus`, `studentLink`, `onEndLesson`, `uploadAllowed`, `onRequestUpload`, `onUploadHandled`).

### İki bağımsız gerçek-zamanlı kanal, tek Durable Object
Her ders odası (`roomId`) için Cloudflare Worker'da bir `BasaranBoardRoom` Durable Object örneği var (`env.ROOMS.idFromName(roomId)`, `worker/index.js`). Bu tek obje iki farklı WebSocket path'ini yönetiyor:

1. **`/connect/:roomId`** — tldraw'ın kendi CRDT senkron altyapısı (`@tldraw/sync` client + `@tldraw/sync-core`'un `TLSocketRoom`'u). Çizim/şekil senkronu tamamen kütüphane tarafından yönetiliyor, buraya elle dokunmaya gerek yok.
2. **`/lobby/:roomId`** — elle yazılmış, "aptal" bir broadcast kanalı (`src/lib/roomChannel.js` client, `worker/index.js`'te `lobbyPeers` Set'i server). Worker gelen her JSON mesajı **olduğu gibi**, göndereni hariç tutarak odadaki herkese iletir. Mesaj tipi yönlendirme/iş mantığının tamamı client tarafında (`TeacherRoom.jsx` / `StudentJoin.jsx`). **Yeni bir sinyal tipi eklemek server-side hiçbir değişiklik gerektirmez** — sadece iki uçta yeni bir `msg.type` handler'ı yeterli.

Şu an kullanılan `/lobby` mesaj tipleri:
| Tip | Yön | Payload |
|---|---|---|
| `join-request` | öğrenci → öğretmen | `{studentId, name}` |
| `join-approved` / `join-rejected` | öğretmen → öğrenci | `{studentId}` |
| `student-left` | öğrenci → öğretmen (beforeunload) | `{studentId}` |
| `lesson-ended` | öğretmen → tüm öğrenciler | `{}` |
| `upload-request` | öğrenci → öğretmen | `{studentId, name}` |
| `upload-approved` / `upload-rejected` | öğretmen → öğrenci | `{studentId}` |
| `upload-done` | öğrenci → öğretmen | `{studentId}` |

Lokal dev'de React StrictMode, effect'leri iki kez çalıştırdığı için `createRoomChannel` da iki kez çağrılabilir (biri hemen kapanan fazla bir WebSocket açar). Bu sadece dev-only bir durum, production build'de olmuyor — kafa karıştırıcı çift log görürsen bu yüzdendir, bug değildir.

### Zemin (ground) katmanları ve materyal
- `GroundModeContext` dört modu tutar: `white` / `grid` / `coordinate` / `material`.
- `GroundGrid.jsx`, tldraw'ın `components.Grid` override'ı olarak kayıtlı; `grid` modunda ekran merkezine sabit `CenteredAxisGrid`, `coordinate` modunda sayfa orijinine bağlı LOD'lu `PageAnchoredAxisGrid` çizer (isimler kafa karıştırıcı: "grid" = Koordinat Ekseni etiketli, "coordinate" = Kareli Defter etiketli — UI etiketleriyle mod id'leri ters eşleşiyor, `LeftToolbar.jsx`'teki `BASE_GROUNDS` listesine bak).
- Materyal yükleme: `src/utils/materialFiles.js` (PDF.js ile sayfa→canvas render, ya da görsel→dataURL) → `MaterialContext` (`pages` dizisi + `currentIndex`) → `MaterialLayer.jsx` mevcut sayfayı kilitli bir tldraw `image` shape'i olarak zemine yerleştirir → `TopBar.jsx` sayfa gezinme okları gösterir (`< Sayfa 01/12 >`).

### Öğrenci dosya yükleme izni (§1.4)
`LeftToolbar.jsx`'teki yükleme butonu artık her zaman render edilir; `restricted && !uploadAllowed` iken kilit rozetiyle gösterilir. Kilitliyken tıklama dosya seçiciyi açmaz, bunun yerine `onRequestUpload` çağrılır (→ `upload-request` mesajı) ve yerel bir uyarı gösterilir. Öğretmen tarafında `TeacherRoom.jsx` bunu `join-request` ile aynı kart UI'ında (`.join-request-card`) listeler. Onay, `uploadAllowed`'ı true yapar; başarılı yükleme sonrası `onUploadHandled` otomatik olarak tekrar kilitler ve `upload-done` gönderir.

## Deployment

İki bağımsız deploy hattı var, birbirini tetiklemez:
- **Frontend**: GitHub `main`'e push → Vercel otomatik deploy. `vercel.json`'daki rewrite, `/ders/:id` ve `/katil/:id` gibi client-side rotalara direkt gidişte 404 vermesini engelliyor.
- **Sync backend**: `npm run worker:deploy` (wrangler) ile Cloudflare'a manuel deploy edilir. `worker/index.js`'i değiştirdikten sonra bunu çalıştırmayı unutma — sadece git push yetmez.

## Ürün spesifikasyonuna göre eksikler

Bkz. `BASARANBOARD_PROJE_ANAYASASI.md`. Tek kalan madde: **Öğretmen Ekran Kilidi** ("Görünümü Kilitle") — denendi (öğretmenin kamerasını `/lobby` kanalı üzerinden öğrenciye yayınlayıp `editor.setCamera(..., {force:true})` ile kilitli takip ettirme), ama mesaj iletiminin gerçekten çalıştığı doğrulanamadığı için geri alındı. Yeniden ele alınırsa gerçek cihazlarla (otomatik tarayıcı test aracı değil — tldraw'ın `requestAnimationFrame`'e bağlı reactivity mekanizmaları orada yanlış-negatif üretiyor) test edilmeli.
