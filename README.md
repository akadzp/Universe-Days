Berikut isi README.md lengkap dalam bahasa Indonesia, sesuai baseline terbaru yang sudah kita sepakati.

Pocer — Arsitektur UI, Authority System & Governance

> Status: Baseline UI Canonical
Ruang lingkup: User Interface, navigasi, presentasi, interaksi, konsumsi data, batas mutation, dan governance UI terhadap system
Prinsip utama: System adalah keputusan mutlak untuk UI.




---

1. Tujuan Dokumen

Dokumen ini mendefinisikan kontrak arsitektur UI Pocer.

README ini bukan definisi ulang domain system. Domain, authority, ownership, validation, temporal rules, provenance, continuity, persistence, AI boundary, dan aturan sistem lainnya tetap ditentukan oleh system governance dan domain rules.

Dokumen ini menetapkan bagaimana UI harus berperilaku terhadap system tersebut.

UI Pocer harus selalu dipahami sebagai:

> Interface untuk user terhadap system.



UI bukan:

pemilik data;

sumber kebenaran;

domain owner;

rule engine;

validation authority;

persistence layer;

fallback data source;

dummy-data provider;

AI authority;

Canon authority;

mekanisme untuk mengubah sistem di luar contract yang diberikan system.



---

2. Prinsip Absolut: System Berkuasa Penuh atas UI

Prinsip tertinggi UI Pocer adalah:

> System adalah keputusan mutlak untuk UI.



Artinya, UI harus menerima keputusan system mengenai:

data;

state;

identity;

relationship;

location;

object;

knowledge;

behavior;

style;

continuity;

temporal validity;

event;

process;

story lifecycle;

production status;

validation result;

permission;

mutation validity;

provenance;

persistence;

Canon;

Sandbox;

dan seluruh aturan domain lainnya.


Jika UI dan system berbeda, UI harus tunduk kepada system.

UI tidak boleh membuat keputusan sendiri hanya karena:

data terlihat lebih baik jika diisi;

halaman terlihat lebih lengkap;

user interface membutuhkan nilai default;

komponen membutuhkan object;

demo membutuhkan data;

empty state terlihat kurang menarik;

backend belum mengembalikan data;

developer menganggap nilai tersebut masuk akal;

AI menghasilkan nilai yang terlihat meyakinkan.


Urutan authority:

SYSTEM
  ↓
DOMAIN / GOVERNANCE
  ↓
VALIDATION
  ↓
CANONICAL STATE
  ↓
UI
  ↓
USER

Untuk informasi:

CANONICAL / AUTHORITATIVE SYSTEM DATA
  ↓
BACKEND / CONTRACT
  ↓
UI
  ↓
USER

Untuk perubahan:

USER INTENT
  ↓
UI
  ↓
SYSTEM COMMAND / CONTRACT
  ↓
VALIDATION
  ↓
DOMAIN AUTHORITY
  ↓
CANONICAL STATE
  ↓
PERSISTENCE

UI tidak boleh memotong jalur tersebut.


---

3. UI Tidak Boleh Mengubah Sistem

UI secara keseluruhan tidak boleh mengubah sistem secara langsung.

Yang dimaksud dengan sistem mencakup seluruh canonical/domain state, bukan hanya database.

UI tidak boleh secara langsung mengubah:

Character;

Actor;

Actress;

Object;

Location;

Relationship;

Knowledge;

State;

Behavior;

Style;

Continuity;

Event;

Process;

Universe;

Daily Universe;

Story Canon;

persistence;

temporal state;

provenance;

authority;

atau domain state lainnya.


UI hanya boleh meminta system melakukan operasi yang memang disediakan system.

3.1 Mutation yang sah

Pola yang benar:

UI
 ↓
User Action
 ↓
Command / API Contract
 ↓
System Validation
 ↓
Domain Owner
 ↓
Provenance
 ↓
Canonical State
 ↓
Persistence

Pola yang dilarang:

UI
 ↓
ubah object lokal
 ↓
anggap system berubah

atau:

UI
 ↓
langsung tulis database

atau:

UI
 ↓
ubah cache
 ↓
tampilkan sebagai Canon

Local React state, store frontend, cache, component state, atau state visual bukan Canon.


---

4. UI Hanya Interface

UI memiliki empat fungsi utama:

1. Display — menampilkan informasi dari system.


2. Navigate — membantu user berpindah ke workflow yang tepat.


3. Interact — menerima input dan intent user.


4. Request — meminta system melakukan operasi yang valid.



UI bukan tempat untuk:

menentukan truth;

memperbaiki Canon;

membuat domain fact;

mengarang state;

memutuskan ownership;

memutuskan relationship;

menentukan temporal truth;

mengubah proposal menjadi Canon;

menentukan validation result;

menentukan authority.


Kesederhanaan UI harus diperoleh melalui abstraksi dan information architecture, bukan dengan menghilangkan aturan system.


---

5. Tidak Ada Data Dummy di Luar System

Ini adalah aturan wajib.

> UI tidak boleh membuat data dummy, contoh, mock, fallback, atau data sintetis di luar system lalu menampilkannya seolah-olah merupakan data system.



Larangan ini berlaku untuk:

production UI;

development UI;

empty state;

fallback rendering;

sample list;

fake character;

fake actor;

fake actress;

fake story;

fake object;

fake location;

fake relationship;

fake event;

fake history;

fake activity;

fake statistics;

fake universe;

fake production result.


Jika system tidak memiliki data, UI tidak boleh menciptakan data pengganti.

5.1 Yang boleh dilakukan UI

Jika data belum tersedia:

System tidak memberikan data
        ↓
UI menampilkan keadaan kosong / belum tersedia

Contoh:

"Belum ada data."

"Belum tersedia."

"Belum tercatat."

"Belum diketahui."

"Tidak dapat dimuat."

"Belum terselesaikan."


Pemilihan label harus tetap sesuai semantic state dari system.

5.2 Placeholder visual bukan domain data

Placeholder visual diperbolehkan hanya jika jelas merupakan elemen presentation.

Contoh yang diperbolehkan:

skeleton loading;

shimmer;

icon;

layout placeholder;

disabled field sebelum data tersedia.


Contoh yang dilarang:

mengisi nama karakter palsu;

menampilkan tanggal palsu;

membuat relationship palsu;

menampilkan jumlah actor palsu;

membuat story contoh yang terlihat seperti story nyata;

mengisi default domain value tanpa diberikan system.


Aturan sederhana:

> Placeholder boleh menjadi visual. Placeholder tidak boleh menjadi fakta.




---

6. Loading, Empty, Unknown, Error Bukan Hal yang Sama

UI harus membedakan keadaan:

Loading

System belum selesai memberikan data.

Empty

System memberikan hasil valid bahwa collection tersebut kosong.

Unknown

System tidak mengetahui nilainya.

Not Recorded

Informasi tersebut tidak tercatat.

Not Applicable

Informasi tersebut memang tidak berlaku.

Unresolved

System mengetahui terdapat kondisi yang belum terselesaikan.

Error

Permintaan atau proses gagal.

UI tidak boleh mengubah semua kondisi tersebut menjadi satu empty state generik.


---

7. Tidak Ada Silent Fallback

Fallback tidak boleh digunakan untuk menggantikan system data.

Contoh yang dilarang:

const characters = apiCharacters ?? demoCharacters;

Jika apiCharacters tidak tersedia, demoCharacters tidak boleh ditampilkan sebagai karakter system.

Pola yang benar:

API tidak tersedia
      ↓
UI menampilkan unavailable/error state

Jika system memberikan nilai UNKNOWN:

UNKNOWN
  ↓
UNKNOWN

Bukan:

UNKNOWN
  ↓
"default value"


---

8. Tidak Ada Silent Inference

UI tidak boleh melakukan inference domain.

UI tidak boleh menyimpulkan:

Actor adalah Character hanya karena bentuk data;

Character memiliki relationship hanya karena dua karakter sering muncul bersama;

Object dimiliki seseorang karena object muncul pada scene;

Character berada di suatu Location hanya karena story menyebut lokasi tersebut;

Character mengetahui sesuatu karena informasi tersebut ada pada story;

event terjadi karena narasi mengatakan sesuatu;

state berubah karena UI melihat perubahan presentation;

data yang hilang berarti false;

data kosong berarti tidak ada;

data tidak ditemukan berarti tidak pernah ada.


Jika system tidak memberikan fakta tersebut, UI tidak boleh menciptakannya.


---

9. Tidak Ada Silent Repair

UI tidak boleh memperbaiki data system secara diam-diam.

Jika ditemukan conflict:

Detect
  ↓
Display
  ↓
Explain
  ↓
User chooses valid action
  ↓
System validates
  ↓
Authorized mutation

Bukan:

Detect
  ↓
UI automatically repairs

UI bukan continuity repair engine.


---

10. Domain System Tetap Menjadi Authority

UI harus mengikuti domain ownership yang ditentukan system.

Secara konseptual:

UNIVERSE
│
├── TEMPORAL
│
├── ACTOR
│   ├── Character
│   └── Entity
│
├── OBJECT
│
├── LOCATION
│
├── RELATIONSHIP
│
├── EVENT
│
├── PROCESS
│
└── KNOWLEDGE

Dengan proyeksi:

UNIVERSE
   ↓
DAILY UNIVERSE
   ↓
STORY
   ↓
PAGE

UI tidak boleh menggantikan owner domain tersebut.


---

11. Actor & Actress

Dalam domain Pocer terdapat istilah:

> Actor & Actress



Istilah tersebut merupakan terminology domain dan harus dipertahankan.

Area Actor & Actress mencakup:

Actor;

Actress;

Character;

seluruh aturan yang berkaitan dengan Character;

identity;

profile;

state;

behavior;

knowledge;

style;

continuity;

relationship reference;

history;

workflow karakter.


UI tidak boleh menyederhanakan area ini menjadi hanya "Karakter" jika hal tersebut menghilangkan terminology domain Actor & Actress.


---

12. Character Bukan Hanya Snapshot

Character merupakan identity/domain entity.

UI harus membedakan:

Identity;

Profile;

State;

Behavior;

Knowledge;

Style;

Relationships;

Continuity;

History.


Profile bukan State.

State bersifat temporal.

Character detail boleh menyatukan informasi tersebut dalam satu workspace agar mudah digunakan user, tetapi grouping UI tidak boleh menghilangkan semantic distinction.


---

13. Relationship

Relationship merupakan domain tersendiri.

Character dapat memiliki reference terhadap relationship, tetapi Character bukan authority relationship.

UI tidak boleh menciptakan relationship dari:

proximity;

story text;

visual grouping;

repeated appearance;

assumption.


Jika relationship ditampilkan pada Actor & Actress, UI harus memperlakukannya sebagai reference.

Canonical management tetap mengikuti system contract.


---

14. Knowledge

Knowledge berbeda dari objective Universe truth.

UI harus dapat membedakan:

apa yang benar di Universe;

apa yang diketahui Actor/Actress;

apa yang dipercaya;

apa yang berupa rumor;

apa yang belum diketahui.


UI tidak boleh menampilkan knowledge sebagai objective fact tanpa semantic basis dari system.


---

15. Behavior dan Style

Behavior adalah pola tindakan.

Style adalah cara Actor/Actress mengekspresikan sesuatu.

Keduanya tidak boleh diperlakukan sebagai:

personality replacement;

state;

knowledge;

relationship;

identity.


UI boleh menyajikannya dengan cara yang mudah dipahami user, tetapi semantic boundary tetap dipertahankan.


---

16. Continuity

Continuity berfungsi sebagai pemeriksa/cross-checker.

UI tidak boleh memperlakukan continuity sebagai:

owner Canon;

auto-repair mechanism;

source of truth pengganti domain owner.


Status continuity dapat mencakup:

CONSISTENT;

NEW_INFORMATION;

VALID_CHANGE;

CONFLICT;

BLOCKED;

UNKNOWN.


UI harus menampilkan hasil system tanpa mengubah makna status tersebut.


---

17. Universe

Universe adalah authoritative world state.

Universe memiliki authority terhadap world truth, termasuk:

characters;

objects;

locations;

relationships;

knowledge;

behavior;

style;

events;

processes;

continuity/history;

dan state temporal lainnya.


UI tidak boleh membuat Universe truth dari story, page, AI output, atau presentation state.


---

18. Daily Universe

Daily Universe merupakan temporal projection/context dari Universe untuk periode tertentu.

Daily Universe bukan Universe baru.

UI harus mempertahankan perbedaan antara:

Universe;

Daily Universe;

Story;

Page.


Daily Universe dapat menjadi context untuk Cerita, tetapi tidak boleh dianggap sebagai source berbeda yang bebas dari authority Universe.


---

19. Story

Story bukan Universe.

Story adalah narrative artifact/projection yang memilih, mengatur, dan menyampaikan informasi dari world context.

Pola:

Authoritative Universe
        ↓
Daily Universe
        ↓
Narrative Production
        ↓
Story

Story tidak boleh menjadi source of truth untuk Universe.

Jika story berbeda dengan authoritative data, UI harus mempertahankan perbedaan tersebut dan mengarahkan pemeriksaan melalui workflow yang sesuai.


---

20. Daily Page

Daily Page merupakan presentation/narrative projection.

Page tidak boleh menjadi authority terhadap:

Character;

Object;

Location;

Relationship;

Knowledge;

State;

Event;

Universe.


Perubahan page tidak otomatis mengubah Canon.


---

21. Narrator

Narrator merupakan bagian dari creative story production.

Narrator bertanggung jawab terhadap creative direction seperti:

ide;

composition;

tone;

voice;

prose style;

pacing;

POV;

vocabulary;

dialogue preference;

scene/exposition preference;

emotional intensity;

suspense;

humor;

author instructions;

creative constraints.


Namun:

> Narrator bukan Canon authority.



UI tidak boleh memberikan Narrator kemampuan untuk langsung mengubah Canon.

Creative flow:

AUTHORITATIVE UNIVERSE
        ↓
DAILY UNIVERSE
        ↓
NARRATOR
        ↓
LLM / PRODUCTION
        ↓
PROPOSAL
        ↓
VALIDATION
        ↓
DOMAIN OWNER
        ↓
CANON


---

22. AI Bukan Source of Truth

AI adalah production worker/proposer.

AI output tidak otomatis menjadi Canon.

Pola yang benar:

AI Output
   ↓
Proposal
   ↓
Validation
   ↓
Authorized Domain Mutation
   ↓
Canon

UI tidak boleh menyembunyikan status proposal apabila status tersebut relevan.

UI juga tidak boleh melakukan:

AI Output → Canon

secara langsung.


---

23. Navigasi Utama — Baseline Final

Navigasi utama Pocer memiliki lima slot.

Urutan dan fungsi:

1. Dashboard


2. Actor & Actress


3. Cerita


4. [Reserved / Empty]


5. Profil User



Penting:

> Slot nomor 4 sengaja kosong.



Slot nomor 4 belum memiliki workspace/menu yang ditentukan.

UI tidak boleh mengisinya sendiri dengan:

Cocokkan;

Dunia;

Pengaturan;

Diagnostik;

Mesin Produksi;

atau fitur lain.


Slot tersebut reserved sampai system/product decision menentukan workspace yang benar.


---

24. Dashboard

Dashboard adalah workspace untuk seluruh hal yang berkaitan dengan dashboard.

Dashboard bertanggung jawab terhadap:

ringkasan;

kondisi saat ini;

informasi penting;

aktivitas yang memang tersedia dari system;

konteks yang membantu user memahami keadaan aplikasi.


Dashboard bukan owner terhadap domain data yang diringkas.

Jika Dashboard menampilkan Character, Story, Object, atau informasi lainnya, data tersebut tetap berasal dari domain/system authority masing-masing.

Dashboard tidak boleh memiliki duplicate editor untuk domain lain.


---

25. Actor & Actress Workspace

Actor & Actress merupakan workspace utama untuk:

Actor;

Actress;

Character;

seluruh fungsi dan aturan yang berkaitan dengan Character.


Area ini dapat memiliki internal sections sesuai kebutuhan product, selama tidak menciptakan root navigation baru.

Contoh konseptual:

Actor & Actress
├── Actor / Actress registry
├── Character
├── Group
├── Character creation
├── Character detail
│   ├── Identity / Profile
│   ├── State
│   ├── Behavior
│   ├── Style
│   ├── Knowledge
│   ├── Relationship references
│   ├── Continuity
│   └── History
└── Other Character-related workflows

Struktur internal dapat berubah sesuai system contract, tetapi seluruhnya tetap berada di workspace Actor & Actress.


---

26. Cerita Workspace

Cerita mencakup seluruh user-facing story workflow.

Termasuk:

build story;

Daily Story;

Daily Page;

ide;

production workflow;

hasil produksi;

history;

revisi story;

creative direction yang memang tersedia bagi user.


Istilah internal seperti:

Production Runner;

Pipeline;

Narrator Engine;

Provider;

Persistence Layer;


tidak boleh menjadi primary user-facing navigation jika tidak dibutuhkan oleh user.

User harus melihat workflow "Cerita", bukan arsitektur backend.


---

27. Reserved Workspace

Root navigation nomor 4 sengaja belum memiliki fitur.

Aturan:

tetap kosong;

tidak diberi label fitur sementara;

tidak diisi berdasarkan asumsi developer;

tidak digunakan sebagai tempat memindahkan fitur yang belum memiliki home;

tidak menjadi tempat menaruh fitur hanya agar navigation terlihat penuh.


Reserved slot merupakan keputusan product yang belum ditetapkan.


---

28. Profil User

Profil User mencakup user-related matters.

Contohnya dapat meliputi hal-hal yang memang dimiliki oleh user/account system, seperti:

profile;

preferensi user;

account-related settings;

informasi personal yang memang diberikan system.


Profil User bukan tempat untuk system governance atau domain management.

UI tidak boleh menaruh internal engine configuration di Profil User hanya karena configuration tersebut terlihat seperti "settings".


---

29. Sidebar

Sidebar bukan root navigation tambahan.

Sidebar juga bukan duplikasi dari lima workspace utama.

Sidebar tidak boleh menjadi tempat untuk mengulang:

Dashboard;

Actor & Actress;

Cerita;

Reserved workspace;

Profil User.


Sidebar hanya boleh berisi fungsi yang memang telah ditentukan sebagai contextual/system utility oleh product.

Status Sidebar

Isi Sidebar selain mode switch belum ditetapkan dalam baseline ini.

Karena itu:

> Jangan mengarang isi Sidebar.



Proposal lama seperti:

Tata Kelola & Aturan;

Mesin Produksi;

Kronologi Waktu;

Diagnostik;

Snapshot Semesta;

Audit & Provenance;


bukan baseline final Sidebar.

Fitur-fitur tersebut tidak boleh otomatis dimasukkan ke Sidebar tanpa keputusan product/domain yang baru.


---

30. Mode Switch di Bagian Paling Bawah Sidebar

Sidebar harus menyediakan mode switch di bagian paling bawah.

Mode internal system:

Production;

Sandbox.


Bahasa UI harus user-friendly dan menjelaskan konsekuensinya.

Contoh terminology yang dapat digunakan:

Mode Utama — bekerja dengan data utama/official system.

Ruang Uji — melakukan eksplorasi atau percobaan tanpa diam-diam menggantikan data utama.


Label final dapat disesuaikan, tetapi prinsipnya tetap:

> User harus memahami bahwa Production dan Sandbox memiliki konsekuensi berbeda.



Mode switch tidak boleh sekadar mengganti warna atau tema.


---

31. Production dan Sandbox

Production dan Sandbox adalah boundary system, bukan sekadar UI theme.

UI harus mengikuti keputusan system mengenai mode tersebut.

Sandbox tidak boleh secara diam-diam menggantikan Canon Production.

Secara konseptual:

PRODUCTION
    ↓
AUTHORITATIVE / MAIN STATE

sedangkan:

SANDBOX
    ↓
SAFE EXPERIMENTATION
    ↓
VALIDATED / EXPLICIT WORKFLOW
    ↓
POSSIBLE AUTHORIZED RESULT

UI tidak boleh menganggap Sandbox state sebagai Production Canon hanya karena user sedang melihatnya.


---

32. Sidebar Tidak Boleh Menjadi Second System

Sidebar bukan tempat untuk menampilkan semua internal system.

UI tidak harus membuat menu untuk:

domain owner;

authority level;

execution engine;

production runner;

persistence;

raw snapshot;

internal pipeline;

infrastructure;

provider;

internal registry.


Internal architecture hanya ditampilkan jika benar-benar diperlukan sebagai user-facing information.


---

33. Single Home Rule

Setiap user-facing feature harus memiliki satu canonical UI home.

Tujuannya:

mencegah duplicate editor;

mencegah conflicting mutation flow;

mencegah ambiguous ownership;

menjaga konsistensi;

membuat user tahu harus pergi ke mana.


Data boleh direferensikan di tempat lain.

Tetapi:

> Reference bukan canonical home.



Contoh:

Character
  ↓
Canonical Home: Actor & Actress

Jika Character muncul pada Dashboard atau Cerita, halaman tersebut hanya menampilkan reference/context dan mengarahkan user ke Actor & Actress untuk workflow Character.


---

34. Reference Tidak Sama dengan Ownership

UI harus membedakan:

1. melihat/reference;


2. mengedit/mutate.



Sebuah entity boleh muncul pada banyak halaman.

Tetapi mutation hanya boleh dilakukan melalui workflow yang memang diberikan system untuk entity tersebut.

Contoh:

Story
  ↓
menampilkan Character reference
  ↓
User ingin mengubah Character
  ↓
Actor & Actress
  ↓
Official Character workflow

Bukan:

Story
  ↓
duplicate Character editor


---

35. Header

Header adalah global application context.

Header dapat menampilkan:

current application context;

active Universe context;

temporal context;

global search;

user/application controls;

global status.


Header bukan second feature navigation.

Header tidak boleh menjadi tempat kedua untuk:

Actor & Actress;

Cerita;

domain workspace;

system administration;

duplicate feature navigation.



---

36. Global Search

Global Search adalah locator.

Search bertugas membantu user menemukan:

entity;

story;

page;

object;

location;

atau artifact lain yang memang tersedia.


Search tidak menjadi canonical workspace.

Jika user menemukan Character melalui search, search harus mengarahkan user ke canonical Actor & Actress workflow.

Search tidak boleh membuat duplicate mutation flow.


---

37. UI State vs System State

UI state adalah state presentation/interaksi.

Contoh:

active navigation;

selected tab;

filter;

sorting;

pagination;

modal;

drawer;

expanded section;

input yang belum dikirim.


System state adalah state domain.

Contoh:

Character state;

relationship;

object ownership;

location;

temporal state;

Universe state;

Canon.


UI state tidak boleh disamakan dengan system state.


---

38. Cache Bukan Authority

Cache hanyalah optimization.

Jika cache berbeda dari system:

SYSTEM
  >
CACHE

System menjadi dasar state final.

UI tidak boleh mempromosikan cache menjadi Canon.

Cache juga tidak boleh menjadi fallback source yang diam-diam menggantikan response system tanpa semantic distinction.


---

39. Client Validation vs System Validation

UI boleh melakukan client-side validation untuk UX:

format;

required input;

type;

length;

immediate feedback.


Namun client validation bukan authority.

System tetap menentukan:

domain validity;

temporal validity;

cross-domain validity;

provenance;

continuity;

mutation permission;

Canonical state.


Pola:

Client Validation
    ↓
UX Feedback

dan:

System Validation
    ↓
Actual Decision


---

40. Action Visibility

UI hanya boleh menampilkan action yang valid untuk context.

Action availability harus tunduk kepada:

permission;

entity state;

lifecycle;

temporal constraint;

workflow;

validation;

system contract.


UI tidak boleh menampilkan tombol sebagai seolah-olah dapat dilakukan jika system tidak menyediakan operasi tersebut.

Jika system menolak operasi, UI harus mempertahankan keputusan system.


---

41. No Hidden Mutation

Hal-hal berikut tidak boleh menyebabkan mutation Canon secara tersembunyi:

membuka halaman;

berpindah navigation;

search;

filtering;

sorting;

preview;

loading;

refresh;

rendering;

membuka detail;

menutup modal;

mengganti tab.


Mutation harus eksplisit dan melalui system contract.


---

42. Optimistic UI

Optimistic UI bukan alasan untuk menyatakan Canon telah berubah.

Jika optimistic state digunakan:

1. UI menyimpan temporary presentation state.


2. System menerima command.


3. System melakukan validation.


4. System memberikan result.


5. UI mengadopsi result system.


6. Jika gagal, UI mengembalikan state sesuai system.



Untuk mutation Canon yang memiliki cross-domain consequence, UI sebaiknya menunggu confirmation system.


---

43. Temporal Safety

UI harus mempertahankan konteks waktu.

UI tidak boleh:

mencampurkan state dari waktu berbeda tanpa penjelasan;

menganggap current state sebagai historical truth;

menganggap historical state sebagai current truth;

mengubah effective date secara lokal;

menyembunyikan temporal conflict.


Jika system memberikan temporal context, UI harus menampilkannya secara jelas saat relevan.

Wall-clock browser tidak boleh menggantikan Universe time.


---

44. Story dan Canon Boundary

Story output tidak otomatis menjadi Canon.

Jika production menghasilkan sesuatu yang berpotensi menjadi domain fact:

Production Output
      ↓
Proposal
      ↓
Validation
      ↓
Domain Owner
      ↓
Canonical Mutation

UI harus mempertahankan boundary tersebut.

Tidak boleh:

Story text
  ↓
UI
  ↓
Universe fact


---

45. Data Presentation

UI boleh melakukan transformation yang murni presentational.

Contoh:

format tanggal;

format angka;

sorting tampilan;

grouping visual;

responsive layout;

truncation;

pagination;

visual hierarchy.


Transformation tersebut tidak boleh mengubah semantic meaning.

Jika system mengatakan value UNKNOWN, formatting tidak boleh membuatnya terlihat sebagai known value.


---

46. Internal Terminology vs User Terminology

UI harus menggunakan bahasa yang mudah dipahami user.

Istilah internal seperti:

Canon Rules;

Truth Levels;

Owner System;

Authority Level;

Immutable Revision Ledger;

Engine Hardening;

External Providers;

Raw Snapshot State Inspector;

Universe Instance ID;

Production Runner;

Pipeline;

Provenance;

Persistence;


tidak boleh menjadi primary UX language tanpa kebutuhan yang jelas.

Istilah tersebut boleh muncul pada:

diagnostics;

developer/admin tooling;

technical detail;

audit information;

advanced system information;


jika memang diperlukan.

User-facing workflow harus menggunakan bahasa berdasarkan pekerjaan user, bukan struktur internal backend.


---

47. System Architecture Tidak Sama dengan UI Information Architecture

Backend dapat memiliki banyak subsystem.

UI tidak harus memetakan:

1 backend domain = 1 menu

Sebaliknya:

Multiple backend domains
        ↓
One user workflow
        ↓
One UI workspace

Contoh Actor & Actress dapat menggunakan data dari:

Character;

Knowledge;

Relationship;

Continuity;

Temporal;

History.


Namun user tidak perlu melihat semua domain tersebut sebagai root menu terpisah.


---

48. UI Tidak Boleh Mengarang Feature Home

Jika sebuah feature belum memiliki canonical UI home, UI tidak boleh sembarangan:

memasukkannya ke Dashboard;

memasukkannya ke Sidebar;

memasukkannya ke Reserved slot;

membuat root menu baru;

menaruhnya di Profil User.


Feature placement harus diputuskan terlebih dahulu.

Reserved berarti reserved.


---

49. Empty Workspace adalah Valid State

Workspace tidak harus selalu penuh.

Jika slot navigation memang reserved, UI harus mempertahankan keadaan tersebut.

Jika system tidak memiliki data, UI harus menampilkan empty/unknown state yang sesuai.

Tidak ada kewajiban untuk membuat UI terlihat penuh menggunakan data buatan.

> Kebenaran system lebih penting daripada kepenuhan tampilan.




---

50. Error Handling

Error dari system harus dipertahankan maknanya.

Secara konseptual, UI dapat membedakan:

input error;

validation error;

conflict;

permission error;

unavailable operation;

temporal conflict;

persistence failure;

production failure;

unresolved condition.


UI tidak boleh mengubah semua error menjadi:

> "Something went wrong."



jika system memberikan informasi yang lebih berguna dan aman untuk user.


---

51. Persistence Boundary

UI tidak boleh bergantung pada detail persistence.

UI tidak perlu mengetahui:

database implementation;

file path;

snapshot directory;

raw storage format;

persistence implementation.


UI berkomunikasi melalui contract.

Jika persistence gagal, UI menampilkan hasil system.

UI tidak membuat persistence fallback sendiri.


---

52. Audit dan Provenance

Mutation yang melalui UI harus dapat ditelusuri oleh system.

UI tidak perlu menampilkan seluruh metadata internal.

Namun jika system memberikan informasi yang diperlukan untuk:

history;

provenance;

status;

conflict;

audit;


UI tidak boleh menghilangkannya dengan cara yang menyesatkan.

UI tidak membuat provenance sendiri.


---

53. Production Flow

Production flow user-facing:

User Intent
    ↓
UI
    ↓
Production Request
    ↓
Authoritative Context
    ↓
Narrator / Production
    ↓
AI Output / Proposal
    ↓
Validation
    ↓
Accepted Result

UI hanya menjadi interface terhadap workflow tersebut.

UI tidak boleh:

bypass validation;

menerima output sebagai Canon tanpa keputusan system;

mengubah proposal secara diam-diam;

menyatakan production berhasil jika system belum menyatakan berhasil.



---

54. Forbidden UI Patterns

Berikut pola yang dilarang:

1. UI membuat domain truth.


2. UI menyimpan Canon sebagai source of truth.


3. UI melakukan direct database mutation.


4. UI mengubah cached object dan menganggap Canon berubah.


5. UI membuat dummy domain data.


6. UI membuat fallback domain data.


7. UI menggunakan sample data sebagai production data.


8. UI menggunakan mock data di production path.


9. UI mengisi UNKNOWN dengan default domain value.


10. UI mengubah NOT_RECORDED menjadi false/empty.


11. UI menganggap absence sebagai negative fact.


12. UI melakukan silent inference.


13. UI melakukan silent repair.


14. UI mengubah Proposal menjadi Canon.


15. UI menganggap AI output sebagai Canon.


16. UI menganggap Story sebagai Universe truth.


17. UI menganggap Page sebagai Universe truth.


18. UI membuat duplicate canonical editor.


19. UI melakukan mutation ketika hanya melakukan navigation.


20. UI menentukan relationship truth.


21. UI menentukan spatial truth.


22. UI menentukan temporal truth.


23. UI menentukan epistemic truth.


24. UI menentukan validation result sebagai pengganti system.


25. UI mengubah Sandbox menjadi Production secara lokal.


26. UI mengisi Reserved navigation dengan feature yang belum diputuskan.


27. UI mengarang isi Sidebar.


28. UI menjadikan internal backend architecture sebagai primary user workflow.


29. UI menggunakan browser wall-clock sebagai Universe time.


30. UI menganggap cache sebagai authority.


31. UI mengarang permission.


32. UI mengarang ownership.


33. UI menyembunyikan conflict.


34. UI menyembunyikan proposal status.


35. UI menyatakan operation berhasil sebelum system mengonfirmasi.


36. UI menggunakan visual placeholder sebagai domain fact.




---

55. Canonical UI Architecture

Baseline navigation:

POCER
│
├── Dashboard
│
├── Actor & Actress
│   └── seluruh Actor, Actress,
│       Character, dan Character-related workflows
│
├── Cerita
│   └── seluruh story workflows
│
├── [RESERVED / EMPTY]
│
└── Profil User

Sidebar:

SIDEBAR
│
├── Contextual / approved utilities
│
├── ...
│
└── Mode Switch
      ├── Production / Mode Utama
      └── Sandbox / Ruang Uji

Isi Sidebar selain mode switch belum menjadi keputusan final.

Jangan menambahkan fitur tanpa keputusan baru.


---

56. Hubungan UI dengan System Governance

Model authority:

SYSTEM GOVERNANCE
        │
        ├── rules
        ├── authority
        ├── ownership
        ├── validation
        ├── temporal rules
        ├── provenance
        ├── persistence
        └── mutation boundary
                 │
                 ↓
                UI
        ┌────────┼────────┐
        ↓        ↓        ↓
     Display  Navigate  Request
                 │
                 ↓
              USER

UI tidak berada di atas governance.

UI juga tidak menggantikan governance.


---

57. UI Contract Consumer

Setiap UI feature harus dapat ditelusuri:

UI Feature
    ↓
UI Interaction
    ↓
System Contract
    ↓
Domain Authority
    ↓
Validation
    ↓
Canonical Result

Jika operation tidak tersedia pada system contract:

> UI tidak boleh menciptakan operation tersebut.



Jika system tidak menyediakan data:

> UI tidak boleh menciptakan data tersebut.



Jika system menolak perubahan:

> UI harus tunduk pada penolakan tersebut.




---

58. Testing Requirements

UI harus diuji bukan hanya secara visual, tetapi juga terhadap boundary system.

Navigation Tests

Memastikan:

lima root navigation sesuai baseline;

Actor & Actress menjadi workspace Actor/Actress/Character;

Cerita menjadi story workspace;

Reserved tetap kosong;

Profil User menjadi user workspace;

tidak ada root menu tambahan tanpa keputusan.


System Authority Tests

Memastikan:

UI tidak membuat domain truth;

UI tidak melakukan direct mutation;

UI mengikuti response system.


Dummy/Fallback Tests

Memastikan:

tidak ada dummy domain data;

tidak ada fallback domain data;

tidak ada sample data yang tampil sebagai real data;

unavailable tetap unavailable.


Unknown Tests

Memastikan:

UNKNOWN tetap UNKNOWN;

NOT_RECORDED tetap NOT_RECORDED;

UNRESOLVED tetap UNRESOLVED.


Mutation Tests

Memastikan seluruh mutation melalui contract.

Proposal Tests

Memastikan production/AI output tidak langsung menjadi Canon.

Temporal Tests

Memastikan temporal context tidak hilang.

Continuity Tests

Memastikan conflict tidak menghasilkan silent repair.

Reference Tests

Memastikan reference tidak menciptakan duplicate mutation path.

Sandbox Tests

Memastikan Sandbox tidak diam-diam menggantikan Production Canon.


---

59. Definition of Done untuk UI

Sebuah UI feature dianggap sesuai arsitektur apabila:

memiliki canonical home yang jelas;

menggunakan terminology user-facing yang tepat;

mengambil data dari system;

tidak membuat domain data sendiri;

tidak menggunakan dummy/fallback sebagai system data;

membedakan loading/empty/unknown/error;

tidak melakukan silent inference;

tidak melakukan silent repair;

tidak mengubah Canon secara langsung;

menggunakan system contract untuk mutation;

tunduk pada system validation;

mempertahankan temporal context;

mempertahankan provenance/status ketika relevan;

tidak menganggap AI sebagai authority;

tidak menganggap story/page sebagai Universe truth;

tidak membuat duplicate editor;

tidak menambahkan navigation yang belum diputuskan.



---

60. Prinsip Implementasi Frontend

Frontend secara konseptual:

Presentation
    ↓
UI State
    ↓
Contract Client
    ↓
System

Bukan:

Presentation
    ↓
Business Truth
    ↓
Local Mutation
    ↓
Fake Persistence

Komponen UI boleh mengelola:

layout;

interaction;

selection;

filters;

sorting;

form state;

visual state.


Komponen UI tidak boleh menjadi tempat utama untuk:

domain authority;

canonical validation;

ownership;

relationship truth;

temporal truth;

epistemic truth;

persistence authority.



---

61. Prinsip Data Flow

Read

AUTHORITATIVE SYSTEM
        ↓
VALIDATED DATA
        ↓
UI CONTRACT
        ↓
PROJECTION / VIEW MODEL
        ↓
UI
        ↓
USER

Mutation

USER
  ↓
UI
  ↓
EXPLICIT COMMAND
  ↓
DOMAIN OWNER
  ↓
VALIDATION
  ↓
PROVENANCE
  ↓
CANONICAL STATE
  ↓
PERSISTENCE

Creative Production

AUTHORITATIVE UNIVERSE
        ↓
DAILY UNIVERSE
        ↓
NARRATOR
        ↓
LLM / PRODUCTION
        ↓
PROPOSAL
        ↓
VALIDATION
        ↓
DOMAIN OWNER
        ↓
CANON


---

62. Mental Model User

User tidak seharusnya dipaksa memahami struktur internal system.

User cukup memahami:

Dashboard
Actor & Actress
Cerita
Reserved
Profil User

Kemudian:

masuk ke Actor & Actress untuk Actor/Actress/Character;

masuk ke Cerita untuk story;

menggunakan Dashboard untuk overview;

menggunakan Profil User untuk user-related matters;

melihat Reserved sebagai workspace yang belum ditentukan;

menggunakan Sidebar hanya untuk fungsi yang memang disediakan dan mode Production/Sandbox.


Complexity system tetap berada di belakang UI.


---

63. UI Boleh Sederhana, System Tidak Boleh Disederhanakan Secara Salah

Tujuan UI adalah membuat system dapat digunakan dengan mudah.

Namun:

> Kesederhanaan UI tidak boleh diperoleh dengan menghapus truth, authority, validation, provenance, atau domain boundary.



Contoh yang benar:

Backend:
UNKNOWN
      ↓
UI:
"Belum diketahui"

Contoh yang salah:

Backend:
UNKNOWN
      ↓
UI:
"Normal"

Contoh yang benar:

Backend:
Proposal
      ↓
UI:
"Proposal — belum menjadi data utama"

Contoh yang salah:

Backend:
Proposal
      ↓
UI:
"Data Character"


---

64. Prinsip Utama yang Tidak Boleh Dilanggar

Jika seluruh README ini harus diringkas menjadi beberapa aturan:

1. System adalah authority.

SYSTEM > UI

2. UI adalah interface.

UI ≠ DOMAIN
UI ≠ CANON
UI ≠ AUTHORITY

3. UI tidak boleh mengubah system secara langsung.

UI → CONTRACT → SYSTEM

4. UI tidak boleh membuat data domain.

NO DUMMY
NO FAKE FALLBACK
NO SILENT DEFAULT
NO SYNTHETIC DOMAIN DATA

5. Data yang tidak ada tidak boleh dikarang.

MISSING ≠ FALSE
UNKNOWN ≠ DEFAULT
EMPTY ≠ NOT_EXIST

6. Story bukan Universe.

STORY ≠ CANON
PAGE ≠ CANON
AI OUTPUT ≠ CANON

7. Actor & Actress adalah terminology domain.

Workspace tersebut mencakup seluruh Actor/Actress dan seluruh Character-related rules/workflows.

8. Root navigation memiliki lima slot.

Dashboard
Actor & Actress
Cerita
[Reserved / Empty]
Profil User

9. Reserved tetap kosong sampai ada keputusan.

UI tidak boleh mengarang feature baru.

10. Sidebar bukan tempat membuang feature yang belum memiliki home.

Isi Sidebar harus mengikuti keputusan product/system.

11. Mode Production/Sandbox harus tersedia di bagian paling bawah Sidebar.

Bahasanya harus mudah dipahami user dan tetap merepresentasikan boundary system.

12. Canon hanya berubah melalui jalur system yang sah.

USER
 ↓
UI
 ↓
CONTRACT
 ↓
VALIDATION
 ↓
DOMAIN AUTHORITY
 ↓
CANON


---

65. Final Statement

Pocer UI bukan system kedua.

Pocer UI bukan database kedua.

Pocer UI bukan fallback engine.

Pocer UI bukan dummy-data engine.

Pocer UI bukan domain owner.

Pocer UI bukan validation authority.

Pocer UI bukan Canon authority.

Pocer UI bukan AI authority.

Pocer UI adalah:

> interface yang memungkinkan user berinteraksi dengan system tanpa mengambil alih keputusan system.



Karena itu, prinsip final Pocer adalah:

SYSTEM
                      │
             absolute authority
                      │
             domain + governance
                      │
              validation + rules
                      │
                    CANON
                      │
                  CONTRACT
                      │
                      UI
                      │
                    USER

Dan untuk seluruh implementasi:

> Jika UI menginginkan sesuatu tetapi system tidak mengatakan demikian, UI harus mengikuti system.



> Jika data tidak diberikan system, UI tidak boleh mengarangnya.



> Jika perubahan tidak diizinkan system, UI tidak boleh memaksakannya.



> Jika sebuah feature belum memiliki home yang diputuskan, UI tidak boleh mengarang home-nya.



> Jika sebuah status belum menjadi Canon, UI tidak boleh menampilkannya sebagai Canon.



> UI harus membuat system mudah digunakan, bukan membuat system mengikuti UI.
