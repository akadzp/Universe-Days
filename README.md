Pocer UI Architecture & Governance

1. Tujuan Dokumen

Dokumen ini mendefinisikan arsitektur antarmuka pengguna (UI) untuk Pocer.

Dokumen ini mengatur:

- tujuan UI;
- prinsip desain UI;
- struktur navigasi;
- struktur sidebar;
- tata letak halaman;
- hubungan antar-area UI;
- batas tanggung jawab setiap navigasi;
- aturan pemisahan fitur;
- aturan penggunaan data dari backend;
- kepatuhan UI terhadap governance dan domain rules;
- aturan mutation dari UI;
- aturan terhadap data "UNKNOWN", "NOT_RECORDED", dan kondisi yang belum diketahui;
- aturan terhadap data hasil produksi AI;
- aturan terhadap Canon, Projection, dan Proposal;
- aturan agar UI tidak membuat asumsi terhadap data;
- batas antara UI dan sistem domain.

Dokumen ini tidak mendefinisikan ulang domain system.

Domain, authority, ownership, validation, temporal rules, provenance, continuity, persistence, AI boundary, dan aturan sistem lainnya tetap didefinisikan oleh system governance dan domain rules.

UI hanya menjadi consumer dan command client terhadap aturan tersebut.

---

2. Prinsip Utama

2.1 UI Berorientasi Pengguna

Struktur UI harus mengikuti mental model pengguna, bukan struktur internal backend.

UI tidak boleh memaksa pengguna memahami:

- domain owner;
- system owner;
- execution engine;
- production runner;
- persistence layer;
- validation layer;
- domain contract;
- internal authority level;
- internal storage;
- internal pipeline.

Terminologi internal hanya boleh ditampilkan apabila memang diperlukan untuk memahami kondisi atau tindakan yang relevan bagi pengguna.

---

2.2 UI Bukan Pemilik Kebenaran

UI tidak memiliki authority atas Canon.

UI:

- membaca data;
- menampilkan data;
- meminta perubahan;
- meminta proses;
- menampilkan hasil validation;
- menampilkan hasil production;
- mengarahkan user kepada workflow yang valid.

UI tidak boleh:

- menentukan kebenaran domain;
- membuat fakta Canon sendiri;
- mengubah data secara langsung;
- melakukan silent repair;
- melakukan silent inference;
- mengubah Proposal menjadi Canon;
- mengubah Projection menjadi Canon;
- menentukan hasil validation secara lokal sebagai pengganti backend.

---

2.3 Backend Tetap Menjadi Authority

Seluruh aturan domain tetap berasal dari backend.

UI harus menganggap backend sebagai sumber authority untuk:

- identity;
- state;
- relationship;
- object;
- location;
- knowledge;
- temporal validity;
- continuity;
- story state;
- persistence;
- validation;
- provenance;
- mutation permission.

UI tidak boleh mengimplementasikan ulang business rule secara parsial lalu menganggap hasil lokal sebagai keputusan final.

UI dapat melakukan validation teknis untuk kebutuhan UX, tetapi validation tersebut tidak menggantikan validation backend.

---

3. Struktur Navigasi Utama

Pocer menggunakan lima navigasi utama yang berada pada bottom navigation.

Urutan dari kiri ke kanan:

1. Dashboard
2. Aktor
3. Cerita
4. Cocokkan
5. Dunia

Dashboard | Aktor | Cerita | Cocokkan | Dunia

Kelima navigasi tersebut merupakan user-facing functional areas.

Navigasi tidak merepresentasikan satu-per-satu domain backend.

---

4. Bottom Navigation

4.1 Tujuan

Bottom navigation menyediakan perpindahan antar-lima konteks utama aplikasi.

Bottom navigation harus:

- selalu tersedia pada root application layout;
- memiliki urutan tetap;
- memiliki state aktif yang jelas;
- tidak berubah berdasarkan halaman internal;
- tidak digunakan untuk menampilkan entity detail;
- tidak digunakan untuk menampilkan system internals.

---

4.2 Dashboard

Dashboard adalah konteks observasi utama.

Tujuannya adalah memberikan ringkasan keadaan aplikasi dan universe yang sedang aktif.

Dashboard bersifat terutama read-oriented.

Sidebar

Dashboard
├── Beranda
├── Hari Ini
└── Aktivitas

Tanggung jawab

Dashboard bertanggung jawab untuk:

- ringkasan kondisi;
- konteks waktu aktif;
- ringkasan aktivitas;
- informasi status yang relevan bagi pengguna;
- akses cepat menuju area yang memerlukan perhatian.

Dashboard tidak menjadi owner terhadap data yang ditampilkan.

Dashboard tidak boleh menjadi tempat kedua untuk mengedit entity yang memiliki canonical home pada navigasi lain.

---

5. Aktor

Aktor adalah konteks untuk membangun, melihat, dan mengelola aktor serta karakter.

Sidebar

Aktor
├── Semua Aktor
├── Karakter
├── Grup
├── Buat Karakter
└── Riwayat

5.1 Semua Aktor

Digunakan untuk melihat registry aktor yang tersedia.

Halaman ini harus menggunakan data backend sebagai sumber daftar dan status.

Filtering, sorting, pagination, dan search merupakan fungsi presentasi dan tidak boleh mengubah data Canon.

---

5.2 Karakter

Digunakan untuk mengakses karakter yang sudah ada.

Detail karakter dapat memiliki sub-navigation internal atau tab:

Karakter
├── Ringkasan
├── Profil
├── Keadaan
├── Perilaku
├── Gaya
├── Pengetahuan
├── Relasi
├── Continuity
└── Riwayat

Sub-navigation tersebut bukan root navigation baru.

Informasi yang ditampilkan berasal dari domain yang berwenang.

UI tidak boleh menggabungkan data dari beberapa domain lalu menganggap hasil gabungan tersebut sebagai source of truth baru.

---

5.3 Grup

Digunakan untuk melihat dan mengelola grouping yang memang tersedia melalui domain contract.

Aturan perubahan group tetap mengikuti domain authority.

UI tidak boleh memindahkan aktor secara langsung melalui perubahan field lokal.

---

5.4 Buat Karakter

Merupakan workflow khusus untuk pembuatan karakter.

Workflow harus:

- mengikuti field yang tersedia pada contract;
- membedakan required dan optional data;
- mempertahankan unknown sebagai unknown;
- tidak mengisi data semantik secara otomatis tanpa dasar;
- menjalankan validation sebelum submission;
- menggunakan command atau contract backend;
- menampilkan hasil persistence dari backend.

UI tidak boleh membuat default yang mempunyai arti domain.

Default visual yang hanya berkaitan dengan presentasi diperbolehkan selama tidak mengubah makna data.

---

5.5 Riwayat

Menampilkan perubahan atau aktivitas yang relevan dengan aktor.

Riwayat bukan sumber data baru.

Riwayat harus berasal dari history/audit/provenance yang tersedia dari backend.

---

6. Cerita

Cerita merupakan konteks untuk proses pembuatan, pembacaan, pengelolaan, dan penelusuran hasil cerita.

Label utama yang digunakan adalah Cerita, bukan istilah internal seperti Production System atau Narrator System.

Sidebar

Cerita
├── Hari Ini
├── Daily Story
├── Daily Page
├── Ide
└── Riwayat

---

6.1 Hari Ini

Merupakan entry point untuk story yang berhubungan dengan Daily Universe aktif.

Halaman ini menghubungkan konteks temporal dengan story tanpa menjadikan story sebagai pengganti Universe.

---

6.2 Daily Story

Menampilkan story yang terikat pada Daily Universe dan lifecycle story yang valid.

UI harus membedakan dengan jelas antara:

- story yang sudah tersedia;
- story yang sedang diproduksi;
- proposal;
- hasil validation;
- hasil final yang sudah diterima sistem.

UI tidak boleh menganggap output AI sebagai story Canon secara otomatis.

---

6.3 Daily Page

Menampilkan page yang berasal dari story dan page production pipeline.

Page merupakan presentation/narrative projection.

Page tidak boleh menjadi source of truth untuk domain Universe.

---

6.4 Ide

Digunakan untuk creative input yang belum menjadi Canon.

Ide harus tetap berada pada status yang sesuai dengan lifecycle-nya.

UI tidak boleh menaikkan status ide secara implisit.

---

6.5 Riwayat

Menampilkan history produksi dan hasil story/page yang tersedia.

Riwayat tidak boleh mengubah status canonical data hanya karena sebuah hasil pernah diproduksi.

---

7. Cocokkan

Cocokkan merupakan area untuk memeriksa konsistensi antara berbagai informasi yang digunakan atau dihasilkan oleh sistem.

Tujuan utama:

«membantu pengguna mengetahui apakah informasi yang ditampilkan, dibangun, atau diproduksi masih konsisten dengan aturan dan data yang authoritative.»

Sidebar

Cocokkan
├── Ringkasan
├── Cerita
├── Karakter
├── Dunia
└── Masalah

---

7.1 Ringkasan

Menampilkan hasil pemeriksaan secara agregat.

Ringkasan tidak boleh menyembunyikan kondisi yang belum diketahui dengan status positif.

Status harus mempertahankan semantic distinction yang diberikan backend.

---

7.2 Cerita

Digunakan untuk pemeriksaan hubungan antara story/page dengan data authoritative yang relevan.

Pemeriksaan dapat mencakup:

- continuity;
- temporal consistency;
- character consistency;
- object consistency;
- location consistency;
- relationship consistency;
- knowledge consistency;
- provenance consistency.

Jenis pemeriksaan yang sebenarnya tetap ditentukan oleh backend.

---

7.3 Karakter

Digunakan untuk melihat consistency result yang berkaitan dengan karakter.

UI harus menampilkan status backend tanpa melakukan reinterpretasi semantik.

---

7.4 Dunia

Digunakan untuk melihat consistency result yang berkaitan dengan world data.

UI tidak boleh mengubah hasil pemeriksaan menjadi keputusan mutation secara otomatis.

---

7.5 Masalah

Menampilkan kondisi yang membutuhkan perhatian pengguna.

Masalah dapat berupa:

- conflict;
- validation failure;
- unresolved state;
- missing required information;
- continuity issue;
- temporal inconsistency;
- provenance issue.

UI harus membedakan:

- masalah;
- informasi yang belum diketahui;
- informasi yang memang tidak dicatat;
- informasi yang tidak berlaku.

Semua kategori tersebut tidak boleh disederhanakan menjadi satu status generik.

---

8. Dunia

Dunia adalah konteks untuk informasi yang membentuk world state di luar workflow karakter dan story.

Sidebar

Dunia
├── Ringkasan
├── Tempat
├── Benda
├── Hubungan
├── Pengetahuan
└── Peristiwa

---

8.1 Ringkasan

Menampilkan struktur dan keadaan dunia secara agregat.

Tidak menjadi sumber Canon baru.

---

8.2 Tempat

Digunakan untuk melihat dan mengelola location data.

Location authority tetap berada pada domain yang ditentukan sistem.

UI tidak boleh menentukan spatial truth hanya berdasarkan informasi yang muncul pada story.

---

8.3 Benda

Digunakan untuk melihat dan mengelola object data.

Object detail dapat mencakup:

- identity;
- description;
- state;
- location;
- ownership;
- access;
- temporal validity;
- history;
- provenance.

UI tidak boleh menciptakan possession atau ownership hanya melalui tampilan.

---

8.4 Hubungan

Digunakan untuk melihat dan mengelola relationship data.

Relationship tetap memiliki canonical owner sendiri.

Character detail dapat menampilkan relationship reference, tetapi relationship management tetap berada pada area Dunia.

Hal ini mencegah fitur relationship memiliki lebih dari satu canonical UI home.

---

8.5 Pengetahuan

Digunakan untuk melihat dan mengelola epistemic information yang memang tersedia untuk user.

UI harus mempertahankan perbedaan antara:

- objective fact;
- belief;
- rumor;
- misconception;
- unknown.

Knowledge tidak boleh ditampilkan sebagai objective Universe truth tanpa status yang sesuai.

---

8.6 Peristiwa

Digunakan untuk melihat dan mengelola event data yang tersedia melalui contract.

Event tidak boleh dibentuk hanya karena sebuah story menyebutkan sesuatu.

Story-derived information harus mengikuti lifecycle dan provenance rules.

---

9. Single Home Rule

Setiap fitur user-facing harus memiliki satu canonical UI home.

Tujuannya adalah mencegah:

- duplicate editor;
- duplicate mutation flow;
- conflicting representations;
- ambiguous ownership;
- inconsistent state;
- user confusion.

Pemetaan canonical home:

Fitur| Canonical UI Home
Ringkasan aplikasi| Dashboard
Kondisi hari aktif| Dashboard / Hari Ini
Aktor| Aktor
Karakter| Aktor
Grup| Aktor
Pembuatan karakter| Aktor
Daily Story| Cerita
Daily Page| Cerita
Ide cerita| Cerita
Production history| Cerita
Continuity check| Cocokkan
Consistency check| Cocokkan
Conflict review| Cocokkan
Tempat| Dunia
Benda| Dunia
Hubungan| Dunia
Pengetahuan| Dunia
Peristiwa| Dunia

Data boleh direferensikan di area lain apabila dibutuhkan untuk konteks.

Namun reference bukan canonical editor.

---

10. Reference vs Ownership

UI harus membedakan antara:

1. display/reference
2. edit/mutation

Entity dapat muncul sebagai reference pada banyak halaman.

Tetapi hanya canonical UI home yang menyediakan workflow mutation untuk entity tersebut.

Contoh aturan arsitektural:

Reference
    ↓
lihat data
    ↓
navigate ke canonical home
    ↓
edit melalui workflow resmi

UI tidak boleh menyediakan duplicate mutation control hanya karena entity sedang ditampilkan pada halaman lain.

---

11. Detail Page

Detail page digunakan untuk fokus pada satu entity atau satu production artifact.

Struktur umum:

Header
├── Breadcrumb
├── Title
├── Status
└── Primary Action

Content
├── Main Information
├── Related Information
└── History / Metadata

Footer / Action Area
└── Contextual Actions

Action harus selalu mengikuti permission dan command yang tersedia.

UI tidak boleh menampilkan action sebagai available apabila backend tidak menyediakan operation yang valid.

---

12. Header Global

Header tidak digunakan sebagai feature navigation.

Header hanya menyediakan application context.

Struktur:

Header
├── Universe Context
├── Temporal Context
├── Global Search
├── Status Indicator
└── User / Application Controls

Header tidak boleh menjadi tempat kedua untuk:

- Character navigation;
- Story navigation;
- Object navigation;
- Relationship navigation;
- World management.

---

13. Global Search

Global search merupakan locator, bukan canonical workspace.

Search dapat menemukan entity atau artifact dari berbagai area.

Hasil search harus mengarahkan user ke canonical UI home.

Search tidak boleh menyediakan mutation flow yang terpisah dari canonical home.

---

14. Data State dan UI State

UI harus membedakan:

Canonical Data

Data authoritative yang berasal dari backend.

Projection

Data yang dibentuk untuk kebutuhan tampilan.

Proposal

Data yang belum menjadi Canon.

Loading

Kondisi UI ketika data belum tersedia.

Unknown

Backend secara eksplisit tidak mengetahui nilainya.

Not Recorded

Nilai tidak tercatat.

Not Applicable

Nilai tidak berlaku terhadap entity atau konteks.

Unresolved

Sistem mengetahui terdapat kondisi yang belum terselesaikan.

Kategori tersebut tidak boleh disamakan.

---

15. Unknown Safety

UI tidak boleh melakukan semantic filling.

Jika backend tidak memberikan informasi, UI tidak boleh mengubah ketiadaan informasi menjadi asumsi.

Aturan:

UNKNOWN
    ↓
UNKNOWN

NOT_RECORDED
    ↓
NOT_RECORDED

UNRESOLVED
    ↓
UNRESOLVED

UI boleh menggunakan placeholder visual untuk kebutuhan layout, tetapi placeholder tersebut tidak boleh menjadi nilai domain.

---

16. Absence Is Not Fact

UI tidak boleh mengartikan tidak adanya data sebagai fakta negatif.

Ketiadaan field, reference, history, atau record tidak otomatis berarti:

- tidak ada;
- tidak pernah terjadi;
- tidak dimiliki;
- tidak diketahui oleh semua pihak;
- tidak tersedia;
- tidak berlaku.

Interpretasi tersebut hanya boleh berasal dari backend contract atau domain rule.

---

17. Temporal Safety

UI harus mempertahankan temporal context.

Data yang ditampilkan harus memiliki konteks waktu yang jelas apabila data tersebut bersifat temporal.

UI tidak boleh:

- menggabungkan state dari waktu berbeda tanpa indikasi;
- menganggap current state sebagai historical truth;
- menganggap historical state sebagai current state;
- mengubah effective date secara lokal;
- menyembunyikan temporal conflict.

Tanggal, period, effective time, dan history harus mengikuti data authoritative.

---

18. Character Safety

UI tidak boleh mencampurkan:

- profile;
- state;
- behavior;
- style;
- knowledge;
- relationship;
- continuity.

Masing-masing harus tetap dapat dibedakan secara semantic.

UI boleh menyajikannya dalam satu detail page karakter, tetapi grouping visual tidak boleh mengubah domain meaning.

---

19. Relationship Safety

Relationship tidak boleh disimpulkan hanya berdasarkan:

- kedekatan visual;
- urutan data;
- interaksi story;
- text similarity;
- asumsi UI.

Relationship hanya dapat ditampilkan sebagai relationship apabila backend menyediakan relationship data yang valid.

Story-derived relationship tetap mengikuti provenance dan validation rules.

---

20. Knowledge Safety

UI harus mempertahankan epistemic boundary.

Pengetahuan suatu actor tidak boleh ditampilkan sebagai Universe truth hanya karena informasi tersebut ada dalam UI.

UI harus membedakan:

- apa yang benar dalam Universe;
- apa yang diketahui actor;
- apa yang dipercaya actor;
- apa yang hanya rumor;
- apa yang belum diketahui.

---

21. Story Safety

Story adalah projection/narrative artifact.

Story tidak boleh diperlakukan sebagai source of truth terhadap Universe.

Jika terdapat perbedaan antara story dan authoritative Universe data, UI harus mengarahkan kondisi tersebut ke Cocokkan.

UI tidak boleh memperbaiki Universe hanya berdasarkan isi story.

---

22. Page Safety

Daily Page adalah presentation layer.

Page tidak boleh menjadi source of truth.

Perubahan pada page tidak boleh secara otomatis mengubah:

- character;
- object;
- location;
- relationship;
- knowledge;
- state;
- event.

Apabila page production menghasilkan informasi baru yang berpotensi mempengaruhi Canon, informasi tersebut harus melewati workflow yang sesuai.

---

23. AI Safety

AI output selalu diperlakukan sesuai status yang diberikan backend.

UI tidak boleh menganggap:

AI output = Canon

AI output harus dapat memiliki status Proposal atau status lain sesuai lifecycle backend.

UI tidak boleh:

- menyembunyikan bahwa data masih proposal apabila status tersebut relevan;
- mengubah proposal menjadi Canon secara lokal;
- menganggap generated content sebagai authoritative fact;
- melakukan silent acceptance.

---

24. Narrator Safety

Narrator merupakan bagian dari story production.

UI tidak perlu mengekspos Narrator sebagai system architecture.

Apabila terdapat user-facing control yang berkaitan dengan creative direction, control tersebut harus disajikan sebagai bagian dari workflow Cerita.

Narrator tidak boleh mendapatkan kemampuan UI untuk mengubah Canon secara langsung.

Creative instruction tetap harus melalui production dan validation boundary.

---

25. Mutation Architecture

Semua mutation dari UI harus mengikuti:

UI
 ↓
Command / Contract
 ↓
Domain Validation
 ↓
Domain Owner
 ↓
Cross-Domain Validation
 ↓
Persistence
 ↓
Updated Canon

UI tidak boleh:

UI
 ↓
Direct database mutation

atau:

UI
 ↓
Modify cached object
 ↓
Assume Canon changed

Local state hanya merupakan UI state sampai backend mengonfirmasi mutation.

---

26. Optimistic UI

Optimistic update hanya boleh digunakan apabila semantics dan rollback behavior telah didefinisikan dengan jelas.

Untuk mutation yang mempengaruhi Canon atau memiliki cross-domain consequence, UI sebaiknya menunggu confirmation dari backend.

UI tidak boleh menampilkan perubahan sebagai Canon apabila backend belum mengonfirmasi mutation.

---

27. Validation

Validation UI terbagi menjadi dua kategori:

Client Validation

Digunakan untuk:

- format;
- required input;
- length;
- type;
- immediate UX feedback.

Server Validation

Merupakan authority untuk:

- domain validity;
- temporal validity;
- cross-domain validity;
- provenance;
- continuity;
- mutation permission;
- canonical state.

Client validation tidak menggantikan server validation.

---

28. Error Handling

Error harus mempertahankan makna dari backend.

UI tidak boleh mengubah semua error menjadi pesan generik apabila informasi yang lebih spesifik tersedia.

Error harus dibedakan sekurang-kurangnya secara konseptual menjadi:

- input error;
- validation error;
- conflict;
- permission error;
- unavailable operation;
- temporal conflict;
- persistence failure;
- production failure;
- unknown/unresolved condition.

UI harus memberikan tindakan yang sesuai dengan jenis error.

---

29. Loading dan Partial Data

UI harus dapat menangani data yang belum lengkap tanpa mengarang nilai.

Loading state harus berbeda dari:

- empty state;
- unknown;
- not recorded;
- unavailable;
- error.

Tidak boleh menggunakan empty state sebagai pengganti unknown.

---

30. Read-Only dan Editable State

UI harus memiliki distinction visual yang jelas antara:

- informasi read-only;
- informasi editable;
- informasi proposal;
- informasi pending;
- informasi conflict.

User harus mengetahui apakah tindakan mereka:

- hanya mengubah tampilan;
- mengubah draft;
- membuat proposal;
- mengubah Canon.

---

31. Action Visibility

UI hanya boleh menampilkan action yang valid untuk context saat ini.

Action availability harus mempertimbangkan:

- backend permission;
- entity state;
- lifecycle;
- temporal constraints;
- current workflow;
- validation status.

UI tidak boleh menampilkan action yang diketahui tidak valid hanya karena action tersebut secara visual tersedia.

---

32. No Hidden Mutation

Navigasi, membuka halaman, melakukan search, filtering, sorting, preview, atau membaca data tidak boleh menyebabkan mutation Canon secara tersembunyi.

Semua mutation harus:

- eksplisit;
- berasal dari user action atau authorized workflow;
- melalui command;
- tervalidasi;
- memiliki provenance.

---

33. No Silent Repair

UI tidak boleh memperbaiki data secara diam-diam.

Jika terdapat conflict:

detect
→ display
→ explain
→ offer valid action

bukan:

detect
→ automatically modify

Repair harus mengikuti workflow yang memiliki authority untuk melakukan perubahan.

---

34. No Silent Inference

UI tidak boleh menyimpulkan data hanya untuk membuat tampilan terlihat lengkap.

Tidak boleh melakukan inference terhadap:

- identity;
- gender;
- relationship;
- location;
- ownership;
- knowledge;
- state;
- behavior;
- style;
- chronology;
- causality.

Jika data tidak tersedia, UI harus mempertahankan status tersebut.

---

35. Navigation Independence from Backend Domains

Backend dapat memiliki lebih banyak domain daripada lima navigasi UI.

Hal tersebut memang disengaja.

UI tidak harus memiliki:

Temporal
Character System
Object System
State System
Knowledge System
Relationship System
Engine
Persistence
Narrator
Production Runner

sebagai menu.

Domain tersebut tetap bekerja sebagai internal authority.

UI hanya menyediakan user-facing workflow yang memanfaatkan domain tersebut.

---

36. UI dan Governance

Hubungan UI dengan system governance:

System Governance
        │
        ├── menentukan apa yang valid
        ├── menentukan siapa yang memiliki authority
        ├── menentukan mutation boundary
        ├── menentukan provenance
        ├── menentukan temporal validity
        └── menentukan validation
                │
                ↓
              UI
        ├── menampilkan
        ├── meminta
        ├── mengarahkan
        └── mengonfirmasi

UI tidak berada di atas governance.

UI juga tidak menggantikan governance.

---

37. UI sebagai Contract Consumer

UI harus dibangun berdasarkan contract yang tersedia.

Setiap halaman harus dapat ditelusuri ke:

UI Feature
    ↓
UI Contract
    ↓
Backend Operation
    ↓
Domain Owner

Apabila sebuah fitur tidak memiliki contract atau operation yang valid, UI tidak boleh mengarang mutation path.

---

38. Consistency Between UI and Backend

Setiap data yang ditampilkan UI harus dapat dikategorikan sebagai:

- authoritative backend data;
- backend-derived projection;
- production proposal;
- presentation-only UI state.

Tidak boleh terdapat kategori kelima berupa:

«UI-generated domain truth.»

UI tidak boleh menjadi sumber domain truth.

---

39. Information Hierarchy

Setiap halaman harus memiliki hierarchy:

Context
    ↓
Primary Information
    ↓
Secondary Information
    ↓
Related Information
    ↓
Actions

Informasi paling penting harus berada pada area utama.

Metadata internal tidak boleh mendominasi UI.

---

40. Layout Rules

Application layout menggunakan:

┌─────────────────────────────────────────────────────────────┐
│ Global Header                                               │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│ Contextual    │                                             │
│ Sidebar       │             Main Content                    │
│               │                                             │
│               │                                             │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│ Dashboard │ Aktor │ Cerita │ Cocokkan │ Dunia              │
└─────────────────────────────────────────────────────────────┘

---

41. Global Header

Header tetap berada di bagian atas.

Tanggung jawab:

- application context;
- active universe;
- temporal context;
- global search;
- user/application controls;
- global status.

Header tidak menjadi second navigation.

---

42. Contextual Sidebar

Sidebar berubah berdasarkan bottom navigation aktif.

Sidebar hanya menampilkan fitur yang relevan terhadap context tersebut.

Sidebar tidak boleh mencampurkan fitur dari lima root navigation.

---

43. Main Content

Main content merupakan area kerja utama.

Main content harus:

- memiliki hierarchy yang jelas;
- mendukung responsive layout;
- menjaga focus pada satu primary task;
- tidak menampilkan internal architecture sebagai primary content;
- tidak mengharuskan user memahami backend terminology.

---

44. Bottom Navigation

Bottom navigation harus tetap sederhana.

Label:

Dashboard
Aktor
Cerita
Cocokkan
Dunia

Tidak boleh ditambah domain baru hanya karena backend memiliki domain baru.

Penambahan root navigation harus dilakukan hanya apabila terdapat kebutuhan user-facing yang independen dan cukup besar untuk menjadi application context baru.

---

45. Responsive Behavior

Pada desktop:

Header
Sidebar + Main Content
Bottom Navigation

Pada ukuran layar yang lebih kecil:

- sidebar dapat berubah menjadi drawer;
- main content tetap menjadi primary workspace;
- bottom navigation tetap menjadi root context;
- contextual navigation tidak boleh hilang tanpa pengganti yang jelas.

Responsive transformation tidak boleh mengubah information architecture.

---

46. Deep Linking

Setiap halaman utama dan detail entity harus dapat memiliki route yang stabil.

Deep link harus mempertahankan:

- active root navigation;
- active sidebar section;
- entity context;
- temporal context apabila relevan;
- read/edit state apabila relevan.

Deep link tidak boleh membuka halaman yang kehilangan context penting.

---

47. Navigation State

Navigation state harus dapat dibedakan dari domain state.

Contoh kategori UI state:

- active navigation;
- selected tab;
- filters;
- sorting;
- pagination;
- modal state;
- drawer state;
- expanded sections.

UI state tersebut tidak boleh ditulis ke Canon kecuali memang merupakan domain mutation yang eksplisit.

---

48. Cache

Cache hanya merupakan optimization layer.

Cache tidak menjadi authority.

Apabila cache berbeda dengan backend:

Backend
    >
Cache

Backend result harus menjadi dasar state final.

UI tidak boleh mempromosikan cached value menjadi Canon.

---

49. Persistence Boundary

UI tidak boleh mengetahui atau mengandalkan:

- file path;
- database implementation;
- snapshot directory;
- storage format;
- persistence implementation detail.

UI hanya menggunakan API/contract.

---

50. Auditability

Mutation yang dilakukan melalui UI harus tetap dapat ditelusuri melalui backend audit/provenance.

UI tidak harus menampilkan seluruh metadata internal kepada user.

Namun UI tidak boleh menghilangkan metadata yang memang diperlukan untuk:

- status;
- provenance display;
- history;
- conflict resolution;
- audit workflow.

---

51. Production Workflow

Workflow production user-facing:

User Intent
    ↓
UI
    ↓
Production Request
    ↓
Authoritative Context
    ↓
Narrative Production
    ↓
AI / Production Output
    ↓
Validation
    ↓
Accepted Result

UI tidak boleh melewati validation boundary.

---

52. Story-to-Canon Boundary

Story dan page tidak otomatis menjadi Canon.

Jika production menghasilkan perubahan potensial terhadap Universe:

Production Output
    ↓
Proposal
    ↓
Validation
    ↓
Authorized Mutation
    ↓
Canon

UI harus mempertahankan boundary tersebut.

---

53. Continuity Workflow

Cocokkan merupakan user-facing surface untuk continuity.

Continuity result digunakan untuk:

- mendeteksi ketidaksesuaian;
- menampilkan lokasi masalah;
- membantu user memahami konflik;
- mengarahkan ke workflow yang sah.

Continuity tidak boleh melakukan auto-repair.

---

54. Accessibility

UI harus mempertahankan accessibility sebagai bagian dari architecture.

Minimal:

- semantic HTML;
- keyboard navigation;
- focus management;
- accessible labels;
- sufficient contrast;
- visible focus state;
- screen reader compatibility;
- status announcement untuk asynchronous operation;
- error association dengan input;
- tidak mengandalkan warna sebagai satu-satunya indikator status.

Status domain seperti conflict, unknown, proposal, dan valid harus dapat dibedakan tanpa mengandalkan warna saja.

---

55. Visual Status Semantics

Visual state harus konsisten.

UI harus memiliki semantic presentation untuk:

- normal;
- active;
- selected;
- pending;
- loading;
- success;
- warning;
- conflict;
- error;
- unknown;
- unresolved;
- read-only.

Visual treatment tidak boleh mengubah semantic value dari backend.

---

56. Design System

Komponen UI harus reusable.

Minimal component categories:

Navigation
Layout
Typography
Form
Input
Button
Card
Table
List
Tabs
Badge
Status
Dialog
Drawer
Toast
Timeline
Empty State
Loading State
Error State

Komponen harus bersifat presentation-oriented dan tidak memiliki domain authority.

Domain mutation tetap dilakukan melalui service/contract layer.

---

57. Separation of Concerns

Arsitektur frontend harus memisahkan:

Presentation
    ↓
View Model / UI State
    ↓
API / Contract Client
    ↓
Backend

Jangan:

Component
    ↓
Direct Domain Mutation

Komponen React/UI tidak boleh menjadi tempat business rules utama.

---

58. UI Business Logic Boundary

Logic yang hanya berkaitan dengan presentasi boleh berada di frontend.

Logic yang menentukan kebenaran domain harus berada di backend.

Frontend boleh menentukan:

- layout;
- sorting;
- filtering;
- visual grouping;
- local form state;
- interaction state.

Frontend tidak boleh menentukan:

- canonical validity;
- ownership;
- relationship truth;
- temporal truth;
- epistemic truth;
- continuity truth;
- authority;
- final mutation validity.

---

59. Testing Requirements

UI harus memiliki test untuk memastikan governance tidak dilanggar.

Minimal test categories:

Navigation Tests

Memastikan lima root navigation dan contextual sidebar bekerja konsisten.

Contract Tests

Memastikan UI menggunakan operation yang tersedia.

Unknown Tests

Memastikan unknown tidak berubah menjadi inferred value.

Mutation Tests

Memastikan semua mutation melalui contract.

Permission Tests

Memastikan action yang tidak valid tidak dapat dieksekusi.

Continuity Tests

Memastikan conflict tidak menghasilkan silent repair.

Proposal Tests

Memastikan AI/production output tidak langsung menjadi Canon.

Temporal Tests

Memastikan temporal context tidak hilang pada workflow yang relevan.

Reference Tests

Memastikan reference page tidak membuat duplicate mutation path.

---

60. Forbidden UI Patterns

UI tidak boleh:

1. membuat domain truth sendiri;
2. menyimpan Canon hanya di frontend;
3. melakukan direct database mutation;
4. melakukan silent repair;
5. melakukan silent inference;
6. mengubah unknown menjadi false;
7. mengubah not recorded menjadi empty;
8. menganggap absence sebagai negative fact;
9. menganggap story sebagai Universe truth;
10. menganggap page sebagai Universe truth;
11. menganggap AI output sebagai Canon;
12. membuat duplicate canonical editor;
13. menyembunyikan conflict;
14. mengubah temporal context secara diam-diam;
15. menampilkan backend architecture sebagai user workflow;
16. menggunakan cached data sebagai authority;
17. membuat domain default yang tidak diberikan backend;
18. mengubah status domain hanya karena kebutuhan presentation;
19. melakukan mutation ketika hanya melakukan navigation;
20. mengimplementasikan ulang domain authority di frontend.

---

61. Canonical UI Information Architecture

Struktur final:

POCER
│
├── Dashboard
│   ├── Beranda
│   ├── Hari Ini
│   └── Aktivitas
│
├── Aktor
│   ├── Semua Aktor
│   ├── Karakter
│   ├── Grup
│   ├── Buat Karakter
│   └── Riwayat
│
├── Cerita
│   ├── Hari Ini
│   ├── Daily Story
│   ├── Daily Page
│   ├── Ide
│   └── Riwayat
│
├── Cocokkan
│   ├── Ringkasan
│   ├── Cerita
│   ├── Karakter
│   ├── Dunia
│   └── Masalah
│
└── Dunia
    ├── Ringkasan
    ├── Tempat
    ├── Benda
    ├── Hubungan
    ├── Pengetahuan
    └── Peristiwa

---

62. Final UI Principle

Arsitektur UI Pocer harus mengikuti prinsip berikut:

User Mental Model
        ↓
User Workflow
        ↓
UI Navigation
        ↓
UI Contract
        ↓
System Governance
        ↓
Domain Authority
        ↓
Validation
        ↓
Canon

Arah informasi:

Canon
  ↓
Backend
  ↓
UI
  ↓
User

Arah mutation:

User
  ↓
UI
  ↓
Contract
  ↓
Backend
  ↓
Validation
  ↓
Domain Authority
  ↓
Canon

UI tidak boleh memotong jalur tersebut.

---

63. Kesimpulan

Pocer memiliki lima konteks utama:

Dashboard
Aktor
Cerita
Cocokkan
Dunia

Kelima konteks tersebut merupakan struktur yang ditujukan kepada pengguna.

Struktur backend tidak harus terlihat pada navigasi.

Domain system tetap menjadi authority di belakang UI.

UI bertugas:

- memberikan model mental yang sederhana;
- menyediakan workflow yang jelas;
- menampilkan data authoritative;
- menjaga perbedaan antara Canon, Projection, Proposal, dan UI state;
- mempertahankan unknown dan unresolved state;
- meminta mutation melalui contract;
- menampilkan validation result;
- mencegah silent inference;
- mencegah silent repair;
- mencegah duplicate canonical editor;
- mempertahankan temporal dan epistemic boundaries;
- mengarahkan pengguna ke workflow yang benar.

Dengan demikian:

«UI boleh sederhana bagi pengguna, tetapi tidak boleh sederhana dengan cara menghilangkan aturan sistem.»

Kesederhanaan UI dicapai melalui abstraksi dan information architecture, bukan dengan menghapus domain constraints.
