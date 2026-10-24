/**
 * UjianKu Pro CBT — backend inti Apps Script (rebuild)
 *
 * Menyediakan API dasar untuk identitas, akun, kelas, siswa, bank soal,
 * paket ujian, token PIN, sesi ujian, penyimpanan jawaban, dan hasil.
 * Jalankan setupAppEnvironment satu kali sebelum membuat deployment Web App.
 */
const UK = {
  version: '1.0.0-rebuild',
  sheets: {
    Users: ['ID','Nama','Username','Role','Salt','PasswordHash','WajibGanti','Aktif','Mapel','KelasDiampu','Dibuat','Email','NoWA','NIP'],
    Kelas: ['ID','Nama','Tingkat','Wali','Kapasitas','Dibuat','NamaKelas','WaliKelas','Ruang','Aktif'],
    Siswa: ['ID','Nama','NIS','NISN','Kelas','JenisKelamin','NoWA','Email','NamaWali','NoWAWali','StatusAktif','Dibuat','StatusWA'],
    Soal: ['ID','Mapel','Tingkat','Topik','KD','Bloom','Tipe','Pertanyaan','URLGambar','A','B','C','D','E','Kunci','Bobot','Kesukaran','Pembahasan','Status','Pemilik','Dibuat'],
    Paket: ['ID','Nama','Kode','Mapel','Tingkat','KelasSasaran','Pemilik','SoalIDs','JumlahSoal','WaktuBuka','WaktuTutup','Durasi','KKM','Toleransi','Status','AcakSoal','AcakOpsi','AntiCheat','SingleDevice','MaksPelanggaran','TampilNilai','IzinPembahasan','Dibuat'],
    Token: ['ID','PIN','PaketID','SiswaID','NIS','Status','Dibuat','Dipakai','ResetAt','DeviceID'],
    Sesi: ['ID','TokenID','PaketID','SiswaID','Status','Mulai','Deadline','Selesai','Jawaban','Ragu','Indeks','Seq','Skor','Benar','Salah','Kosong','Pelanggaran','DurasiDetik','LogPelanggaran','LastSeen','Cara'],
    Settings: ['Kunci','Nilai'],
    Audit: ['Waktu','UserID','Username','Aksi','Detail'],
    KKM: ['Mapel','Kelompok','Nilai','Remedial','Aktif'],
    Info: ['ID','Jenis','Judul','Isi','Deskripsi','URL','Mapel','Kelas','Sasaran','PaketID','Mulai','Selesai','Aktif','Oleh','Dibuat','Diperbarui'],
    CRM: ['ID','Nama','NoWA','Email','Jenis','Sumber','Tags','Catatan','OptOut','Updated','Segmen','Kelas','StatusWA','JumlahPesan','EmailValid','Duplikat','TerakhirDihubungi','Tanggal','Manual','MergedInto','SourceID'],
    CRMLog: ['ID','KontakID','Waktu','Kanal','Ringkasan','Aksi','Status'],
    Notifikasi: ['ID','Jenis','Tujuan','Nama','Pesan','Status','Dibuat','Selesai','Error']
  },
  defaults: {
    NAMA_LEMBAGA: 'Nama Sekolah', NAMA_APLIKASI: 'UjianKu Pro', TAGLINE: 'Ujian Cerdas, Masa Depan Hebat',
    ALAMAT: '', TELEPON: '', WEBSITE: '', LOGO_URL: '', WARNA_UTAMA: '#1E4FD8',
    MOTIVASI_JUDUL: 'Siap. Berlatih. Berprestasi.', MOTIVASI_TEKS: 'Ujian jujur kunci kesuksesan siswa sejati.',
    TAHUN_AJARAN: '', FITUR_MATERI: 'YA', FITUR_ANALITIK: 'YA', PORTAL_URL: '', VERIFIKASI_URL:'',
    KKM_DEFAULT:75,DAFTAR_TINGKAT:'X,XI,XII',DAFTAR_MAPEL:'',TAMPIL_NILAI:'YA',IZIN_PEMBAHASAN:'YA',
    ANTI_CHEAT:'YA',SINGLE_DEVICE:'YA',MAKS_PELANGGARAN:5,AUTOSAVE_DETIK:30,DESIMAL_NILAI:'0',
    REKOM_REMEDIAL:'YA',LOGIN_MAKS_GAGAL:5,LOGIN_KUNCI_MENIT:15,PIN_MAKS_GAGAL:5,PIN_KUNCI_MENIT:15,
    BACKUP_OTOMATIS:'TIDAK',BACKUP_JUMLAH:14
  }
};

function doGet(e) {
  const q = e && e.parameter || {};
  if (q.ping === '1' || q.w) return json_({success:true,pong:Date.now(),message:'UjianKu Pro API aktif.',v:UK.version});
  if (q.action === 'de.cek') return json_({success:false,message:'Modul verifikasi dokumen belum tersedia pada backend inti.'});
  return json_({success:true,message:'UjianKu Pro API aktif.',v:UK.version});
}

function doPost(e) {
  const started = Date.now();
  try {
    const body = JSON.parse(e && e.postData && e.postData.contents || '{}');
    const data = body.data || {};
    const result = dispatch_(String(body.action || ''), data, body);
    result.ms = Date.now() - started; result.t = Date.now(); result.v = UK.version;
    return json_(result);
  } catch (err) {
    const message=String(err && err.message || err); const auth=/^AUTH:/.test(message);
    return json_({success:false,code:auth?'AUTH':'ERROR',message:auth?message.replace(/^AUTH:\s*/,''):message,ms:Date.now()-started,t:Date.now(),v:UK.version});
  }
}

function setupAppEnvironment() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  let ss;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { id = ''; } }
  if (!id) { ss = SpreadsheetApp.create('Database UjianKu Pro CBT'); id = ss.getId(); props.setProperty('SPREADSHEET_ID', id); }
  Object.keys(UK.sheets).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = UK.sheets[name];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    else {
      const width=Math.max(1,sh.getLastColumn()), current=sh.getRange(1,1,1,width).getValues()[0].filter(String);
      const missing=headers.filter(function(h){return current.indexOf(h)<0;});
      if(missing.length)sh.getRange(1,width+1,1,missing.length).setValues([missing]).setFontWeight('bold');
    }
  });
  const defaultSheet=ss.getSheetByName('Sheet1');
  if(defaultSheet&&defaultSheet.getLastRow()===0&&ss.getSheets().length>1)ss.deleteSheet(defaultSheet);
  const settingRows = rows_('Settings');
  Object.keys(UK.defaults).forEach(function(k){if(!settingRows.some(function(r){return r.Kunci===k;})) upsert_('Settings',{Kunci:k,Nilai:UK.defaults[k]},'Kunci');});
  if (!rows_('Users').length) {
    const password = randomPassword_();
    const salt = Utilities.getUuid();
    upsert_('Users',{ID:uid_(),Nama:'Administrator',Username:'admin',Role:'ADMIN',Salt:salt,PasswordHash:hash_(password,salt),WajibGanti:'YA',Aktif:'YA',Mapel:'',KelasDiampu:'',Dibuat:iso_()},'ID');
    Logger.log('AKUN ADMIN AWAL'); Logger.log('Username: admin'); Logger.log('Kata sandi awal: '+password); Logger.log('Catat sandi ini sekarang; hash sandi tidak dapat dibaca kembali.');
  }
  props.setProperty('SESSION_SECRET',props.getProperty('SESSION_SECRET')||Utilities.getUuid()+Utilities.getUuid());
  props.setProperty('SESSION_REV',props.getProperty('SESSION_REV')||'0');
  Logger.log('SETUP SELESAI'); Logger.log('Database: '+ss.getUrl());
  return 'SETUP SELESAI';
}

function resetSandiAdmin() {
  ensure_(); const users=rows_('Users').filter(function(u){return u.Role==='ADMIN'&&u.Aktif!=='TIDAK';});
  if(!users.length) throw new Error('Akun admin tidak ditemukan. Jalankan setupAppEnvironment terlebih dahulu.');
  const password=randomPassword_(); const u=users[0]; u.Salt=Utilities.getUuid(); u.PasswordHash=hash_(password,u.Salt); u.WajibGanti='YA'; upsert_('Users',u,'ID');
  Logger.log('Username: '+u.Username); Logger.log('Kata sandi admin baru: '+password); return 'Sandi admin direset. Periksa log eksekusi.';
}

function dispatch_(action,d,body) {
  if(action==='ping') return ok_({pong:Date.now(),setup:!!PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')});
  if(action==='pub.boot') return ok_({setting:settings_(),waktuServer:Date.now(),versi:UK.version});
  if(action==='batch') {
    const calls=(d.calls||[]).slice(0,10); return ok_({results:calls.map(function(c){return dispatch_(String(c.action||''),c.data||{},body);})});
  }
  if(action==='auth.login') return login_(d,body.dev);
  if(action==='auth.pin') return loginPin_(d,body.dev);
  if(action==='de.cek') return fail_('DOCS','Modul verifikasi dokumen belum tersedia pada backend inti.');
  const session=auth_(body.token, action.indexOf('s.')===0);
  if(action==='auth.me') return ok_({me:session.me});
  if(action==='auth.logoutAll') { if(session.student)return fail_('AUTH','Aksi khusus akun staf.');PropertiesService.getScriptProperties().setProperty('USER_REV_'+session.me.id,String(Date.now()));CacheService.getScriptCache().remove('uk:'+body.token);return ok_({}); }
  if(action==='auth.gantiSandi') return changePassword_(session,d);
  if(action==='s.home') return studentHome_(session);
  if(action==='s.mulai') return startExam_(session);
  if(action==='s.simpan') return saveExam_(session,d);
  if(action==='s.kirim') return submitExam_(session,d);
  if(action==='s.hasil') return studentResult_(session,d.sesiId);
  if(action==='s.pembahasan') return studentReview_(session,d.sesiId);
  if(action==='s.materi') return studentMaterials_(session);
  if(action==='dash.ringkas') return dashboard_(session);
  if(action==='sys.status') { requireRole_(session,['ADMIN']); return systemStatus_(); }
  if(action==='cfg.get') return configData_();
  if(action==='cfg.simpan') { requireRole_(session,['ADMIN']); Object.keys(d.setting||{}).forEach(function(k){if(Object.prototype.hasOwnProperty.call(UK.defaults,k))upsert_('Settings',{Kunci:k,Nilai:d.setting[k]},'Kunci');}); audit_(session,'cfg.simpan','Pengaturan sekolah'); return ok_({}); }
  if(action==='kkm.simpan') { requireRole_(session,['ADMIN']); return saveKkm_(d.rows||[]); }
  if(action==='kelas.list') return classList_(session);
  if(action==='kelas.simpan') { requireRole_(session,['ADMIN']); return saveClass_(d.kelas||{}); }
  if(action==='kelas.hapus') { requireRole_(session,['ADMIN']); return deleteClass_(d.id); }
  if(action==='siswa.list') return studentList_(session);
  if(action==='siswa.simpan') { requireRole_(session,['ADMIN']); return saveStudent_(d.siswa||{}); }
  if(action==='siswa.hapus') { requireRole_(session,['ADMIN']); return deleteStudents_(d.ids||[],!!d.paksa); }
  if(action==='siswa.impor') { requireRole_(session,['ADMIN']); return importStudents_(d.rows||[],!!d.dryRun); }
  if(action==='user.list') { requireRole_(session,['ADMIN']); return ok_({rows:rows_('Users').map(publicUser_),total:rows_('Users').length}); }
  if(action==='user.simpan') { requireRole_(session,['ADMIN']); return saveUser_(d.user||{}); }
  if(action==='user.reset') { requireRole_(session,['ADMIN']); return resetUser_(d.id); }
  if(action==='soal.list') return questionList_(session);
  if(action==='soal.simpan') return saveQuestion_(session,d.soal||{});
  if(action==='soal.hapus') return deleteQuestions_(session,d.ids||[]);
  if(action==='soal.impor') return importQuestions_(session,d.rows||[],!!d.dryRun);
  if(action==='upload.gambar') return uploadQuestionImage_(session,d);
  if(action==='paket.list') return packageList_(session);
  if(action==='paket.simpan') return savePackage_(session,d.paket||{},d.generateToken);
  if(action==='paket.hapus') return deletePackage_(session,d.id);
  if(action==='token.list') return tokenList_(session,d.paketId);
  if(action==='token.generate') return generateTokens_(session,d.paketId,d.kelas);
  if(action==='token.aksi') return tokenAction_(session,d);
  if(action==='rekap.paket') return reportPackage_(session,d.paketId);
  if(action==='rekap.global') return reportGlobal_(session);
  if(action==='rekap.sesi') return studentResult_(session,d.sesiId);
  if(action==='monitor.live') return monitor_(session,d.paketId);
  if(action==='monitor.aksi') return monitorAction_(session,d);
  if(action==='rekap.umumkan') return announceResults_(session,d);
  if(action==='info.list') return infoList_(session,d.jenis);
  if(action==='info.simpan') return saveInfo_(session,d.jenis,d.item||{});
  if(action==='info.hapus') return deleteInfo_(session,d.jenis,d.id);
  if(action==='rahasia.simpan') return saveSecret_(session,d);
  if(action==='audit.list') { requireRole_(session,['ADMIN']); return ok_({rows:rows_('Audit').slice(-300).reverse()}); }
  if(action==='backup.list') return backupList_(session);
  if(action==='backup.json') return exportBackup_(session);
  if(action==='backup.buat') return createBackup_(session);
  if(action==='backup.setelan') return saveBackupSettings_(session,d);
  if(action==='backup.pulihkan') return restoreBackup_(session,d);
  if(action==='crm.sync') return crmSync_(session);
  if(action==='crm.stats') return crmStats_(session);
  if(action==='crm.list') return crmList_(session,d);
  if(action==='crm.detail') return crmDetail_(session,d.kontakId);
  if(action==='crm.save') return crmSave_(session,d.kontak||{});
  if(action==='crm.interaksi') return crmInteraction_(session,d);
  if(action==='crm.merge') return crmMerge_(session,d);
  if(action==='crm.bulk') return crmBulk_(session,d);
  if(action==='crm.export') { requireRole_(session,['ADMIN']);return ok_({rows:crmRows_(session)}); }
  if(action==='crm.import') return crmImport_(session,d.rows||[]);
  return fail_('UNSUPPORTED','Aksi API belum tersedia di backend rebuild: '+action);
}

function login_(d,deviceId) {
  const username=String(d.username||'').trim().toLowerCase();
  const max=Math.max(3,Number(settings_().LOGIN_MAKS_GAGAL)||5),minutes=Math.max(1,Number(settings_().LOGIN_KUNCI_MENIT)||15),key='LOGIN_FAIL_'+username;
  if(attemptsLocked_(key,max))return fail_('LOCKED','Terlalu banyak percobaan. Coba lagi setelah '+minutes+' menit.');
  const u=rows_('Users').filter(function(x){return String(x.Username).toLowerCase()===username&&x.Aktif!=='TIDAK';})[0];
  if(!u||hash_(String(d.password||''),u.Salt)!==u.PasswordHash){const n=recordAttempt_(key,minutes);return fail_('AUTH','Nama pengguna atau kata sandi salah. Percobaan '+n+' dari '+max+'.');}
  CacheService.getScriptCache().remove(key);
  const me={id:u.ID,nama:u.Nama,username:u.Username,role:u.Role,email:u.Email||'',noWA:u.NoWA||'',mapel:csv_(u.Mapel),kelasDiampu:csv_(u.KelasDiampu),wajibGanti:u.WajibGanti==='YA'};
  const token=issue_(me,false); audit_({me:me},'auth.login',username);
  return ok_({token:token,me:me,exp:Date.now()+8*3600000});
}
function loginPin_(d,deviceId) {
  const pin=String(d.pin||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const max=Math.max(3,Number(settings_().PIN_MAKS_GAGAL)||5),minutes=Math.max(1,Number(settings_().PIN_KUNCI_MENIT)||15),key='PIN_FAIL_'+String(deviceId||pin).slice(0,100);
  if(attemptsLocked_(key,max))return fail_('LOCKED','Terlalu banyak percobaan PIN. Coba lagi setelah '+minutes+' menit.');
  const t=rows_('Token').filter(function(x){return String(x.PIN).toUpperCase()===pin&&x.Status!=='ANULIR';})[0];
  if(!t){const n=recordAttempt_(key,minutes);return fail_('PIN','Token PIN tidak valid atau tidak tersedia. Percobaan '+n+' dari '+max+'.');}
  CacheService.getScriptCache().remove(key);
  const s=byId_('Siswa',t.SiswaID), p=byId_('Paket',t.PaketID);
  if(!s||!p) return fail_('PIN','Data peserta atau paket ujian tidak ditemukan.');
  const dev=String(deviceId||'').slice(0,120);if(p.SingleDevice!=='TIDAK'&&t.DeviceID&&dev&&t.DeviceID!==dev)return fail_('DEVICE','Token sedang terikat ke perangkat lain. Minta pengawas melakukan Reset Login.');
  if(p.SingleDevice!=='TIDAK'&&dev){t.DeviceID=dev;upsert_('Token',t,'ID');}
  const me={siswa:{id:s.ID,nama:s.Nama,nis:s.NIS,kelas:s.Kelas,nisn:s.NISN,jk:s.JenisKelamin,email:s.Email,wa:s.NoWA,wali:s.NamaWali},paket:p.ID,mode:t.Status==='TERPAKAI'?'hasil':'baru'};
  t.Status='TERPAKAI';t.Dipakai=t.Dipakai||iso_();upsert_('Token',t,'ID');
  const token=issue_(me,true,t.ID); return ok_({token:token,siswa:me.siswa,paket:p.ID,mode:me.mode,exp:Date.now()+8*3600000});
}
function changePassword_(session,d) {
  if(session.student) return fail_('AUTH','Aksi khusus akun staf.');
  const u=byId_('Users',session.me.id); if(!u||hash_(String(d.lama||''),u.Salt)!==u.PasswordHash) return fail_('AUTH','Kata sandi saat ini salah.');
  const pw=String(d.baru||'');if(pw.length<8||!/[A-Za-z]/.test(pw)||!/[0-9]/.test(pw))return fail_('VALIDATION','Sandi minimal 8 karakter dan harus memuat huruf serta angka.');
  u.Salt=Utilities.getUuid();u.PasswordHash=hash_(pw,u.Salt);u.WajibGanti='TIDAK';upsert_('Users',u,'ID');
  const me=Object.assign({},session.me,{wajibGanti:false}),token=issue_(me,false);return ok_({token:token,me:me,exp:Date.now()+8*3600000});
}

function studentHome_(session) {
  const s=byId_('Siswa',session.me.siswa.id), p=byId_('Paket',session.me.paket);
  if(!s||!p)return fail_('DATA','Siswa atau paket tidak ditemukan.');
  const ses=rows_('Sesi').filter(function(x){return x.PaketID===p.ID&&x.SiswaID===s.ID;})[0];
  const now=Date.now(), buka=new Date(p.WaktuBuka).getTime(), tutup=new Date(p.WaktuTutup).getTime();
  const status=now<buka?'Terjadwal':now<=tutup?'Berlangsung':'Selesai';
  const announcements=rows_('Info').filter(function(i){return i.Jenis==='pengumuman'&&i.Aktif!=='TIDAK'&&(!i.Mulai||new Date(i.Mulai).getTime()<=now)&&(!i.Selesai||new Date(i.Selesai).getTime()>=now)&&(!i.PaketID||i.PaketID===p.ID)&&(!i.Kelas||i.Kelas==='Semua'||csv_(i.Kelas).indexOf(s.Kelas)>=0);}).map(function(i){return {id:i.ID,judul:i.Judul,isi:i.Isi,mulai:i.Mulai,selesai:i.Selesai};});
  const showResult=!!ses&&ses.Status==='SELESAI'&&resultsVisible_(p,now), score=showResult?Number(ses.Skor)||0:null;
  return ok_({siswa:{nama:s.Nama,nis:s.NIS,kelas:s.Kelas,nisn:s.NISN,jk:s.JenisKelamin,email:s.Email,wa:s.NoWA,wali:s.NamaWali},paket:{id:p.ID,nama:p.Nama,kode:p.Kode,mapel:p.Mapel,kelas:s.Kelas,buka:p.WaktuBuka,tutup:p.WaktuTutup,durasi:Number(p.Durasi)||60,kkm:Number(p.KKM)||75,status:status,tokenStatus:'Aktif',antiCheat:p.AntiCheat==='YA',maksPelanggaran:Number(p.MaksPelanggaran)||5},statistik:{dikerjakan:ses&&ses.Status==='SELESAI'?1:0,rata:score,lulus:showResult&&score>=Number(p.KKM),dinilai:ses&&ses.Status==='SELESAI'?1:0,totalPoin:score,delta:{dikerjakan:null,rata:null,lulus:null},tren:[],perMapel:[]},sesi:ses&&ses.Status==='BERJALAN'?{status:'Berjalan',sisaMs:Math.max(0,new Date(ses.Deadline).getTime()-now)}:null,riwayat:[],mendatang:[{nama:p.Nama,mapel:p.Mapel,buka:p.WaktuBuka,tutup:p.WaktuTutup,durasi:Number(p.Durasi)||60,status:status,milikToken:true}],pengumuman:announcements,fitur:{analitik:true,materi:true},waktuServer:now});
}
function startExam_(session) {
  const s=byId_('Siswa',session.me.siswa.id),p=byId_('Paket',session.me.paket); if(!s||!p)return fail_('DATA','Data ujian tidak ditemukan.');
  let ss=rows_('Sesi').filter(function(x){return x.SiswaID===s.ID&&x.PaketID===p.ID;})[0];
  if(ss&&ss.Status==='SELESAI')return ok_({selesai:true,sesiId:ss.ID});
  const now=Date.now(),open=new Date(p.WaktuBuka).getTime(),close=new Date(p.WaktuTutup).getTime();
  if(now<open)return fail_('TIME','Ujian belum dibuka.');if(now>close+Number(p.Toleransi||0)*60000)return fail_('TIME','Waktu mulai ujian sudah berakhir.');
  if(p.Status==='Draf'||p.Status==='Arsip')return fail_('LOCKED','Paket ujian belum diterbitkan.');
  if(!ss){ss={ID:uid_(),TokenID:session.tokenId||'',PaketID:p.ID,SiswaID:s.ID,Status:'BERJALAN',Mulai:iso_(),Deadline:iso_(Math.min(now+(Number(p.Durasi)||60)*60000,close)),Selesai:'',Jawaban:'{}',Ragu:'[]',Indeks:0,Seq:0,Skor:'',Benar:0,Salah:0,Kosong:0,Pelanggaran:0,DurasiDetik:0};upsert_('Sesi',ss,'ID');}
  else if(!ss.TokenID&&session.tokenId){ss.TokenID=session.tokenId;upsert_('Sesi',ss,'ID');}
  session.sesiId=ss.ID; CacheService.getScriptCache().put('uk:'+session.token,JSON.stringify(session),21600);
  const qs=questionsForPackage_(p); if(!qs.length)return fail_('DATA','Paket belum memiliki soal.');
  const publicQs=qs.map(function(q,i){return {no:i+1,id:q.ID,topik:q.Topik,kesukaran:q.Kesukaran,tipe:q.Tipe==='PGK'?'PGK':'PG',teks:q.Pertanyaan,gambar:q.URLGambar||'',bobot:Number(q.Bobot)||1,opsi:['A','B','C','D','E'].filter(function(k){return q[k];}).map(function(k){return {k:k,t:q[k]};})};});
  return ok_({selesai:false,sesi:{id:ss.ID,sisaMs:Math.max(0,new Date(ss.Deadline).getTime()-now)},paket:{id:p.ID,nama:p.Nama,kode:p.Kode,mapel:p.Mapel,durasi:Number(p.Durasi)||60,kkm:Number(p.KKM)||75,antiCheat:p.AntiCheat==='YA',maksPelanggaran:Number(p.MaksPelanggaran)||5,sistemNilai:'Benar = bobot soal'},soal:publicQs,state:{j:parse_(ss.Jawaban,{}),r:parse_(ss.Ragu,[]),i:Number(ss.Indeks)||0,seq:Number(ss.Seq)||0,pel:Number(ss.Pelanggaran)||0},autosaveDetik:Number(settings_().AUTOSAVE_DETIK)||30});
}
function saveExam_(session,d) {
  const ss=byId_('Sesi',session.sesiId);if(!ss||ss.Status!=='BERJALAN')return fail_('AUTH','Sesi ujian tidak aktif.');
  if(Date.now()>new Date(ss.Deadline).getTime())return submitExam_(session,d,true);
  const seq=Number(d.seq)||0;if(seq>=Number(ss.Seq||0)){
    ss.Jawaban=JSON.stringify(d.j||{});ss.Ragu=JSON.stringify(d.r||[]);ss.Indeks=Number(d.i)||0;ss.Seq=seq;
    const ev=(d.ev||[]).filter(function(e){return e&&e.e&&e.e!=='online';});ss.Pelanggaran=(Number(ss.Pelanggaran)||0)+ev.length;ss.LastSeen=iso_();
    if(ev.length){ss.LogPelanggaran=(String(ss.LogPelanggaran||'')+'\n'+ev.map(function(e){return iso_(Number(e.t)||Date.now())+' '+String(e.e);}).join('\n')).slice(-5000);}
    upsert_('Sesi',ss,'ID');
    if(ev.length){const student=byId_('Siswa',ss.SiswaID);appendMonitorEvents_(ss.PaketID,ev.map(function(e){return {nama:student&&student.Nama||'',e:e.e,t:Number(e.t)||Date.now(),i:e.i,n:Object.keys(parse_(ss.Jawaban,{})).length};}));}
    const p=byId_('Paket',ss.PaketID),limit=Number(p&&p.MaksPelanggaran)||5;
    if(p&&p.AntiCheat==='YA'&&ss.Pelanggaran>=limit)return submitExam_(session,d,true,'Batas pelanggaran');
  }
  const out={sisaMs:Math.max(0,new Date(ss.Deadline).getTime()-Date.now()),pel:Number(ss.Pelanggaran)||0};
  const broadcast=readFeed_('UK_BROADCAST_'+ss.PaketID),warning=readFeed_('UK_WARN_'+ss.ID);
  if(broadcast&&broadcast.id!==String(d.bc||''))out.siaran=broadcast;
  if(warning&&warning.id!==String(d.wn||''))out.peringatan=warning;
  return ok_(out);
}
function submitExam_(session,d,auto,reason) {
  const ss=byId_('Sesi',session.sesiId); if(!ss)return fail_('DATA','Sesi ujian tidak ditemukan.');
  if(ss.Status==='SELESAI'){const p=byId_('Paket',ss.PaketID);return ok_({hasil:session.student&&!resultsVisible_(p,Date.now())?null:resultObject_(ss),tersembunyi:!!session.student&&!resultsVisible_(p,Date.now()),sesiId:ss.ID});}
  if(Number(d.seq||0)>=Number(ss.Seq||0)){ss.Jawaban=JSON.stringify(d.j||{});ss.Ragu=JSON.stringify(d.r||[]);ss.Seq=Number(d.seq)||0;}
  const ans=parse_(ss.Jawaban,{}), qs=questionsForPackage_(byId_('Paket',ss.PaketID));let benar=0,salah=0,kosong=0,score=0;
  qs.forEach(function(q,i){const given=String(ans[i]||'').split(',').filter(Boolean).sort().join(',');const key=String(q.Kunci||'').split(',').filter(Boolean).sort().join(',');if(!given)kosong++;else if(given===key){benar++;score+=Number(q.Bobot)||1;}else salah++;});
  score=qs.length?Math.round(score/qs.reduce(function(a,q){return a+(Number(q.Bobot)||1);},0)*10000)/100:0;
  ss.Status='SELESAI';ss.Selesai=iso_();ss.Cara=reason||(auto?'Waktu Habis':'Siswa');ss.Benar=benar;ss.Salah=salah;ss.Kosong=kosong;ss.Skor=score;ss.DurasiDetik=Math.max(0,Math.floor((Date.now()-new Date(ss.Mulai).getTime())/1000));upsert_('Sesi',ss,'ID');
  const p=byId_('Paket',ss.PaketID),hidden=session.student&&!resultsVisible_(p,Date.now());
  return ok_({hasil:hidden?null:resultObject_(ss),cara:reason|| (auto?'Waktu Habis':'Siswa'),selesai:true});
}
function studentResult_(session,id) {
  const ss=(id?byId_('Sesi',id):null)||rows_('Sesi').filter(function(x){return x.SiswaID===session.me.siswa.id&&x.PaketID===session.me.paket;})[0];
  if(!ss)return fail_('DATA','Hasil ujian belum tersedia.');
  if(ss.Status!=='SELESAI')return fail_('LOCKED','Hasil belum tersedia sebelum ujian dikumpulkan.');
  const p=byId_('Paket',ss.PaketID),s=byId_('Siswa',ss.SiswaID);if(session.student&&session.me.siswa.id!==ss.SiswaID)return fail_('AUTH','Tidak boleh melihat hasil peserta lain.');if(!session.student&&!canManagePackage_(session,p))return fail_('AUTH','Tidak berhak melihat sesi peserta ini.');
  if(session.student&&!resultsVisible_(p,Date.now()))return ok_({tersembunyi:true,paket:p.Nama,pesan:'Lembar jawaban sudah diterima. Nilai belum diumumkan oleh sekolah.'});
  const qs=questionsForPackage_(p),answers=parse_(ss.Jawaban,{}),kkm=Number(p.KKM)||75;
  const reviewVisible=p.IzinPembahasan!=='TIDAK'&&Date.now()>=new Date(p.WaktuTutup||0).getTime();
  const butir=qs.map(function(q,i){const pilih=String(answers[i]||''),benar=pilih.split(',').sort().join(',')===String(q.Kunci||'').split(',').sort().join(',');const b={no:i+1,topik:q.Topik||'',kesukaran:q.Kesukaran||'',pilihan:pilih,status:!pilih?'Kosong':benar?'Benar':'Salah',teks:q.Pertanyaan,pembahasan:reviewVisible?q.Pembahasan||'':''};if(reviewVisible||!session.student)b.kunci=q.Kunci;return b;});
  const paket={id:p.ID,nama:p.Nama,kode:p.Kode,mapel:p.Mapel,kelas:s.Kelas,durasi:Number(p.Durasi)||60};
  return ok_({sesiId:ss.ID,paket:paket,nama:s.Nama,nis:s.NIS,kelas:s.Kelas,skor:Number(ss.Skor)||0,kkm:kkm,lulus:Number(ss.Skor)>=kkm,benar:Number(ss.Benar)||0,salah:Number(ss.Salah)||0,kosong:Number(ss.Kosong)||0,jumlah:qs.length,menit:Math.round((Number(ss.DurasiDetik)||0)/60),selesai:ss.Selesai,cara:ss.Cara||'',predikat:Number(ss.Skor)>=90?'A':Number(ss.Skor)>=80?'B':Number(ss.Skor)>=70?'C':'D',peserta:rows_('Siswa').length,peringkat:1,topik:[],pembahasan:reviewVisible,pembahasanBuka:p.WaktuTutup,butir:butir});
}
function studentReview_(session,id) { const r=studentResult_(session,id);if(!r.success)return r;if(!r.data.pembahasan)return fail_('LOCKED','Pembahasan belum dibuka.');return ok_({sesiId:r.data.sesiId,paket:r.data.paket,butir:(r.data.butir||[]).map(function(b){return {no:b.no,topik:b.topik,teks:b.teks,pilihan:b.pilihan,kunci:b.kunci,status:b.status,pembahasan:b.pembahasan,opsi:[]};}),benar:r.data.benar,salah:r.data.salah,kosong:r.data.kosong,skor:r.data.skor,kkm:r.data.kkm,lulus:r.data.lulus,topik:[]}); }

function dashboard_(session) {
  const packages=rows_('Paket').filter(function(p){return canManagePackage_(session,p);}),ids=packages.map(function(p){return p.ID;}),sessions=rows_('Sesi').filter(function(s){return ids.indexOf(s.PaketID)>=0;}),tokens=rows_('Token').filter(function(t){return ids.indexOf(t.PaketID)>=0;}),questions=rows_('Soal').filter(function(q){return session.me.role==='ADMIN'||q.Pemilik===session.me.id;}),now=Date.now(),cut=now-30*86400000;
  const completed=sessions.filter(function(s){return s.Status==='SELESAI'&&new Date(s.Selesai||0).getTime()>=cut;}),scores=completed.map(function(s){return Number(s.Skor)||0;}),running=sessions.filter(function(s){return s.Status==='BERJALAN';});
  const activePackages=packages.filter(function(p){return ['Berlangsung','Terjadwal'].indexOf(displayStatus_(p))>=0;}).map(function(p){const ps=sessions.filter(function(s){return s.PaketID===p.ID;});return {id:p.ID,nama:p.Nama,mapel:p.Mapel,kelas:p.KelasSasaran,buka:p.WaktuBuka,tutup:p.WaktuTutup,kode:p.Kode,status:displayStatus_(p),peserta:ps.length,selesai:ps.filter(function(s){return s.Status==='SELESAI';}).length,berjalan:ps.filter(function(s){return s.Status==='BERJALAN';}).length};});
  const grafik=packages.map(function(p){const ps=sessions.filter(function(s){return s.PaketID===p.ID&&s.Status==='SELESAI';}),sc=ps.map(function(s){return Number(s.Skor)||0;});return sc.length?{kode:p.Kode,rata:Math.round(sc.reduce(function(a,x){return a+x;},0)/sc.length*10)/10,lulus:Math.round(sc.filter(function(x){return x>=(Number(p.KKM)||75);}).length/sc.length*100)}:null;}).filter(Boolean).slice(-8);
  const terbaru=sessions.filter(function(s){return s.Status==='SELESAI';}).sort(function(a,b){return String(b.Selesai).localeCompare(String(a.Selesai));}).slice(0,8).map(function(s){const st=byId_('Siswa',s.SiswaID),p=byId_('Paket',s.PaketID);return {nama:st&&st.Nama||'',paket:p&&p.Nama||'',waktu:s.Selesai,skor:Number(s.Skor)||0,lulus:Number(s.Skor)>=(Number(p&&p.KKM)||75)};});
  return ok_({kpi:{soal:questions.length,paketAktif:packages.filter(function(p){return displayStatus_(p)==='Berlangsung';}).length,paket:packages.length,sesiBerjalan:running.length,tokenAktif:tokens.filter(function(t){return t.Status==='AKTIF';}).length,sesi30:completed.length,rata30:scores.length?scores.reduce(function(a,x){return a+x;},0)/scores.length:null,lulus30:scores.length?Math.round(scores.filter(function(x,i){const s=completed[i],p=byId_('Paket',s.PaketID);return x>=(Number(p&&p.KKM)||75);}).length/scores.length*100):null},aktif:activePackages,grafik:grafik,terbaru:terbaru,contoh:false});
}
function configData_() {
  const setting=settings_(), tingkat=csv_(setting.DAFTAR_TINGKAT), mapel=csv_(setting.DAFTAR_MAPEL);
  const kkm=rows_('KKM').map(function(r){r.Nilai=parse_(r.Nilai,{});return r;});
  return ok_({setting:setting,tingkat:tingkat,mapel:mapel,kkm:kkm});
}
function saveKkm_(list) {
  const incoming=(list||[]).filter(function(r){return String(r.Mapel||'').trim();}), keep=[];
  incoming.forEach(function(r){const name=String(r.Mapel).trim();if(keep.indexOf(name)>=0)throw new Error('VALIDATION: Mapel KKM tidak boleh ganda: '+name);keep.push(name);const values=r.Nilai&&typeof r.Nilai==='object'?r.Nilai:{};Object.keys(values).forEach(function(t){const n=Number(values[t]);if(n<0||n>100)throw new Error('VALIDATION: KKM harus berada antara 0 dan 100.');});upsert_('KKM',{Mapel:name,Kelompok:String(r.Kelompok||''),Nilai:JSON.stringify(values),Remedial:String(r.Remedial||'Maksimal Nilai KKM'),Aktif:r.Aktif==='TIDAK'?'TIDAK':'YA'},'Mapel');});
  rows_('KKM').forEach(function(r){if(keep.indexOf(r.Mapel)<0)deleteByKey_('KKM','Mapel',r.Mapel);});
  return ok_({total:keep.length});
}
function classList_(session) {
  const allowed=session.me.role==='ADMIN'?null:(session.me.kelasDiampu||[]), students=rows_('Siswa'), rows=rows_('Kelas').map(function(k){
    const name=String(k.NamaKelas||k.Nama||'');
    const wali=k.WaliKelas||k.Wali||'',waliUser=byId_('Users',wali);
    return Object.assign({},k,{Nama:name,NamaKelas:name,WaliKelas:wali,NamaWali:waliUser&&waliUser.Nama||wali,Aktif:k.Aktif||'YA',Ruang:k.Ruang||'',JumlahSiswa:students.filter(function(s){return s.Kelas===name&&s.StatusAktif!=='TIDAK';}).length});
  }).filter(function(k){return !allowed||allowed.indexOf(k.NamaKelas)>=0;});
  return ok_({rows:rows,total:rows.length,tingkat:csv_(settings_().DAFTAR_TINGKAT),kpi:{total:rows.length,siswa:students.length}});
}
function saveClass_(x) {
  const name=String(x.NamaKelas||x.Nama||'').trim();if(!name)return fail_('VALIDATION','Nama kelas wajib diisi.');
  const old=x.ID?byId_('Kelas',x.ID):null;
  const duplicate=rows_('Kelas').some(function(k){return String(k.NamaKelas||k.Nama||'').toLowerCase()===name.toLowerCase()&&k.ID!==(old&&old.ID);});
  if(duplicate)return fail_('DUPLICATE','Nama kelas sudah digunakan.');
  const row=Object.assign({},old||{},x,{ID:x.ID||uid_(),Nama:name,NamaKelas:name,Wali:x.WaliKelas||x.Wali||'',WaliKelas:x.WaliKelas||x.Wali||'',Aktif:x.Aktif||'YA',Dibuat:old&&old.Dibuat||iso_()});
  upsert_('Kelas',row,'ID');return ok_({id:row.ID});
}
function deleteClass_(id) {
  const k=byId_('Kelas',id);if(!k)return ok_({});const name=String(k.NamaKelas||k.Nama||'');
  if(rows_('Siswa').some(function(s){return s.Kelas===name;}))return fail_('VALIDATION','Kelas masih memiliki siswa. Pindahkan siswa terlebih dahulu.');
  deleteById_('Kelas',id);return ok_({});
}
function deleteStudents_(ids,force) {
  const blocked=[];(ids||[]).forEach(function(id){const hasHistory=rows_('Sesi').some(function(s){return s.SiswaID===id;});if(hasHistory&&!force){blocked.push(id);return;}rows_('Token').filter(function(t){return t.SiswaID===id;}).forEach(function(t){deleteById_('Token',t.ID);});deleteById_('Siswa',id);});
  return blocked.length?fail_('HISTORY','Sebagian siswa memiliki riwayat ujian dan tidak dihapus. Centang hapus paksa bila memang ingin melanjutkan.'):ok_({});
}
function importStudents_(input,dry) {
  const rows=Array.isArray(input)?input:[],knownClasses=rows_('Kelas').map(function(k){return String(k.NamaKelas||k.Nama||'');}),byNis={};rows_('Siswa').forEach(function(s){byNis[String(s.NIS)]=s;});
  const out={baru:0,diperbarui:0,dilewati:0,galat:[]},pending=[];
  rows.forEach(function(r,i){const nis=String(r.NIS||'').trim(),nama=String(r.Nama||'').trim(),kelas=String(r.Kelas||'').trim();if(!nis||!nama||!kelas){out.dilewati++;out.galat.push('Baris '+(i+2)+': Nama, NIS, dan kelas wajib diisi.');return;}if(knownClasses.indexOf(kelas)<0){out.dilewati++;out.galat.push('Baris '+(i+2)+': kelas "'+kelas+'" belum terdaftar.');return;}const old=byNis[nis];if(old){out.diperbarui++;const merged=Object.assign({},old);Object.keys(r).forEach(function(k){if(r[k]!==''&&r[k]!==null&&r[k]!==undefined)merged[k]=r[k];});pending.push(merged);}else{out.baru++;pending.push(Object.assign({},r,{StatusAktif:r.StatusAktif||'YA'}));}});
  if(!dry){pending.forEach(function(r){saveStudent_(r);});audit_({me:{id:'',username:'system'}},'siswa.impor','baris '+pending.length);}
  const res=ok_(out);res.message=dry?'Pindai selesai; data belum ditulis.':'Impor siswa selesai.';return res;
}
function importQuestions_(session,input,dry) {
  requireRole_(session,['ADMIN','GURU']);const rows=Array.isArray(input)?input:[],existing=rows_('Soal'),out={baru:0,diperbarui:0,dilewati:0,galat:[]},pending=[];
  rows.forEach(function(r,i){const text=String(r.Pertanyaan||'').replace(/\s+/g,' ').trim(),mapel=String(r.Mapel||'').trim();if(!text||!mapel){out.dilewati++;out.galat.push('Baris '+(i+2)+': mapel dan pertanyaan wajib diisi.');return;}const old=existing.filter(function(q){return q.Mapel===mapel&&String(q.Pertanyaan||'').replace(/\s+/g,' ').trim().toLowerCase()===text.toLowerCase();})[0];if(old&&session.me.role!=='ADMIN'&&old.Pemilik!==session.me.id){out.dilewati++;out.galat.push('Baris '+(i+2)+': soal serupa dimiliki guru lain.');return;}if(old){out.diperbarui++;pending.push(Object.assign({},old,r,{ID:old.ID,Pemilik:old.Pemilik}));}else{out.baru++;pending.push(Object.assign({},r,{Pemilik:session.me.id,Status:r.Status||'Aktif'}));}});
  if(!dry){pending.forEach(function(r){saveQuestion_(session,r);});audit_(session,'soal.impor','baris '+pending.length);}
  const res=ok_(out);res.message=dry?'Pindai selesai; data belum ditulis.':'Impor soal selesai.';return res;
}
function infoList_(session,kind) {
  const now=Date.now(),rows=rows_('Info').filter(function(i){if(kind&&i.Jenis!==kind)return false;if(session.student)return i.Aktif!=='TIDAK'&&(!i.Mulai||new Date(i.Mulai).getTime()<=now)&&(!i.Selesai||new Date(i.Selesai).getTime()>=now)&&(!i.Kelas||i.Kelas==='Semua'||csv_(i.Kelas).indexOf(session.me.siswa.kelas)>=0)&&(!i.PaketID||i.PaketID===session.me.paket);return session.me.role==='ADMIN'||i.Oleh===session.me.id;}).sort(function(a,b){return String(b.Diperbarui||b.Dibuat).localeCompare(String(a.Diperbarui||a.Dibuat));});
  return ok_({rows:rows,total:rows.length});
}
function saveInfo_(session,kind,item) {
  requireRole_(session,['ADMIN','GURU']);if(['pengumuman','materi'].indexOf(kind)<0)return fail_('VALIDATION','Jenis konten tidak valid.');
  const old=item.ID?byId_('Info',item.ID):null;if(old&&session.me.role!=='ADMIN'&&old.Oleh!==session.me.id)return fail_('AUTH','Tidak berhak mengubah konten ini.');
  if(!String(item.Judul||'').trim())return fail_('VALIDATION','Judul wajib diisi.');
  const row=Object.assign({},old||{},item,{ID:item.ID||uid_(),Jenis:kind,Judul:String(item.Judul).trim(),Kelas:csv_(item.Kelas).join(','),Oleh:old&&old.Oleh||session.me.id,Aktif:item.Aktif||'YA',Dibuat:old&&old.Dibuat||iso_(),Diperbarui:iso_()});
  upsert_('Info',row,'ID');return ok_({id:row.ID});
}
function deleteInfo_(session,kind,id) {
  requireRole_(session,['ADMIN','GURU']);const item=byId_('Info',id);if(!item)return ok_({});if(kind&&item.Jenis!==kind)return fail_('DATA','Konten tidak ditemukan.');if(session.me.role!=='ADMIN'&&item.Oleh!==session.me.id)return fail_('AUTH','Tidak berhak menghapus konten ini.');deleteById_('Info',id);return ok_({});
}
function studentMaterials_(session) {
  const now=Date.now(),kelas=session.me.siswa.kelas;const rows=rows_('Info').filter(function(i){return i.Jenis==='materi'&&i.Aktif!=='TIDAK'&&(!i.Mulai||new Date(i.Mulai).getTime()<=now)&&(!i.Selesai||new Date(i.Selesai).getTime()>=now)&&(!i.Kelas||i.Kelas==='Semua'||csv_(i.Kelas).indexOf(kelas)>=0);}).map(function(i){return {id:i.ID,judul:i.Judul,mapel:i.Mapel||'',deskripsi:i.Deskripsi||'',url:i.URL||'',tanggal:i.Diperbarui||i.Dibuat};});
  return ok_({rows:rows});
}
function uploadQuestionImage_(session,d) { requireRole_(session,['ADMIN','GURU']);return fail_('UPLOAD','Unggah gambar belum diaktifkan. Gunakan URL gambar https yang sudah dapat diakses siswa.'); }
function studentList_(session) {
  const rows=rows_('Siswa').filter(function(s){return session.me.role==='ADMIN'||(session.me.kelasDiampu||[]).indexOf(s.Kelas)>=0;});
  return ok_({rows:rows,total:rows.length,kpi:{total:rows.length,aktif:rows.filter(function(s){return s.StatusAktif!=='TIDAK';}).length,nonaktif:rows.filter(function(s){return s.StatusAktif==='TIDAK';}).length}});
}
function saveStudent_(x) {
  const nis=String(x.NIS||'').trim(),name=String(x.Nama||'').trim(),kelas=String(x.Kelas||'').trim();
  if(!name||!nis||!kelas)return fail_('VALIDATION','Nama, NIS, dan kelas wajib diisi.');
  const classExists=rows_('Kelas').some(function(k){return String(k.NamaKelas||k.Nama||'')===kelas&&k.Aktif!=='TIDAK';});
  if(!classExists)return fail_('VALIDATION','Kelas belum terdaftar atau nonaktif.');
  const old=rows_('Siswa').filter(function(s){return String(s.NIS)===nis;})[0];
  const row=Object.assign({},old||{},x,{ID:x.ID||old&&old.ID||uid_(),StatusAktif:x.StatusAktif||'YA',Dibuat:old&&old.Dibuat||iso_()});
  upsert_('Siswa',row,'ID');return ok_({id:row.ID});
}
function saveUser_(x) {
  const username=String(x.Username||'').trim().toLowerCase();if(!username||!String(x.Nama||'').trim())return fail_('VALIDATION','Nama dan username wajib diisi.');
  if(!/^[a-z0-9._-]{3,30}$/.test(username))return fail_('VALIDATION','Username harus 3–30 karakter: huruf kecil, angka, titik, minus, atau garis bawah.');
  const old=rows_('Users').filter(function(u){return u.ID===x.ID||String(u.Username).toLowerCase()===username;})[0];if(old&&old.ID!==x.ID)return fail_('DUPLICATE','Username sudah digunakan.');
  const u=Object.assign({},old||{},x,{ID:x.ID||uid_(),Username:username,Role:x.Peran||x.Role||'GURU',Mapel:csv_(x.Mapel||old&&old.Mapel).join(','),KelasDiampu:csv_(x.Kelas||x.KelasDiampu||old&&old.KelasDiampu).join(','),Aktif:x.StatusAktif||x.Aktif||'YA',Dibuat:old&&old.Dibuat||iso_()});
  let plain='';if(!old||x.password){plain=x.password||randomPassword_();u.Salt=Utilities.getUuid();u.PasswordHash=hash_(plain,u.Salt);u.WajibGanti='YA';}
  upsert_('Users',u,'ID');return ok_({username:username,sandiAwal:plain,sandiBaru:plain});
}
function resetUser_(id) {
  const u=byId_('Users',id);if(!u)return fail_('DATA','Akun tidak ditemukan.');const pw=randomPassword_();u.Salt=Utilities.getUuid();u.PasswordHash=hash_(pw,u.Salt);u.WajibGanti='YA';upsert_('Users',u,'ID');
  PropertiesService.getScriptProperties().setProperty('USER_REV_'+u.ID,String(Date.now()));return ok_({username:u.Username,sandiBaru:pw});
}
function publicUser_(u) { return {ID:u.ID,Nama:u.Nama,Username:u.Username,Peran:u.Role,Role:u.Role,Mapel:String(u.Mapel||''),Kelas:String(u.KelasDiampu||''),KelasDiampu:String(u.KelasDiampu||''),Email:u.Email||'',NoWA:u.NoWA||'',NIP:u.NIP||'',Aktif:u.Aktif,StatusAktif:u.Aktif,WajibGanti:u.WajibGanti}; }
function questionList_(session) {
  const all=rows_('Soal').filter(function(q){return session.me.role==='ADMIN'||q.Pemilik===session.me.id;});
  const used={}, packageRows=rows_('Paket'), userNames={};
  packageRows.forEach(function(p){csv_(p.SoalIDs).forEach(function(id){used[id]=(used[id]||0)+1;});});
  rows_('Users').forEach(function(u){userNames[u.ID]=u.Nama||u.Username||'';});
  const facet={mapel:{},bloom:{},kesukaran:{},bulanIni:0,media:0},tingkat={},now=new Date();
  const rows=all.map(function(q){
    const dibuat=q.Diperbarui||q.Dibuat||'';
    q.Dipakai=used[q.ID]||0;
    q.NamaPembuat=userNames[q.Pemilik]||'';
    q.Pembuat=q.Pemilik||'';
    q.DiperbaruiPada=dibuat;
    const mapel=String(q.Mapel||'').trim(),bloom=String(q.Bloom||'').trim(),kes=String(q.Kesukaran||'').trim(),tk=String(q.Tingkat||'').trim();
    if(mapel)facet.mapel[mapel]=(facet.mapel[mapel]||0)+1;
    if(bloom)facet.bloom[bloom]=(facet.bloom[bloom]||0)+1;
    if(kes)facet.kesukaran[kes]=(facet.kesukaran[kes]||0)+1;
    if(tk)tingkat[tk]=true;
    if(q.URLGambar)facet.media++;
    const date=buatDate_(q.Dibuat);
    if(date&&date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth())facet.bulanIni++;
    return q;
  });
  return ok_({rows:rows,total:rows.length,facet:facet,tingkat:Object.keys(tingkat).sort()});
}
function buatDate_(value) { const date=value?new Date(value):null;return date&&!isNaN(date.getTime())?date:null; }
function saveQuestion_(session,x) { requireRole_(session,['ADMIN','GURU']);if(!String(x.Pertanyaan||'').trim())return fail_('VALIDATION','Teks soal wajib diisi.');const prior=x.ID?byId_('Soal',x.ID):null;if(prior&&session.me.role!=='ADMIN'&&prior.Pemilik!==session.me.id)return fail_('AUTH','Tidak berhak mengubah soal ini.');const q=Object.assign({},prior||{},x,{ID:x.ID||uid_(),Pemilik:session.me.role==='ADMIN'?(x.Pemilik||prior&&prior.Pemilik||session.me.id):session.me.id,Status:x.Status||'Aktif',Bobot:Number(x.Bobot)||1,Dibuat:prior&&prior.Dibuat||x.Dibuat||iso_()});upsert_('Soal',q,'ID');return ok_({id:q.ID}); }
function deleteQuestions_(session,ids) { ids.forEach(function(id){const q=byId_('Soal',id);if(q&&(session.me.role==='ADMIN'||q.Pemilik===session.me.id)){q.Status='Arsip';upsert_('Soal',q,'ID');}});return ok_({}); }
function packageList_(session) {
  const kelasGuru=session.me.role==='ADMIN'?rows_('Kelas').map(function(k){return String(k.NamaKelas||k.Nama||'');}).filter(Boolean):(session.me.kelasDiampu||[]);
  const mapelGuru=session.me.role==='ADMIN'?csv_(settings_().DAFTAR_MAPEL):(session.me.mapel||[]);
  const tokenRows=rows_('Token'),sessionRows=rows_('Sesi'),questionRows=rows_('Soal'),users=rows_('Users'),owners={};
  users.forEach(function(u){owners[u.ID]=u.Nama||u.Username||'';});
  const poolQuestion={};questionRows.forEach(function(q){if(q.Status!=='Arsip')poolQuestion[q.ID]=q;});
  const packages=rows_('Paket').filter(function(p){return session.me.role==='ADMIN'||p.Pemilik===session.me.id;});
  const rows=packages.map(function(p){
    const ts=tokenRows.filter(function(t){return t.PaketID===p.ID;}),se=sessionRows.filter(function(s){return s.PaketID===p.ID;}),ids=csv_(p.SoalIDs);
    const jumlahPool=ids.length?ids.filter(function(id){return !!poolQuestion[id];}).length:questionRows.filter(function(q){return q.Status!=='Arsip'&&q.Mapel===p.Mapel&&(!p.Tingkat||q.Tingkat===p.Tingkat);}).slice(0,Number(p.JumlahSoal)||20).length;
    return Object.assign({},p,{DaftarSoal:p.SoalIDs||'',StatusTampil:displayStatus_(p),JumlahPool:jumlahPool,Token:{total:ts.length,aktif:ts.filter(function(t){return t.Status==='AKTIF';}).length,terpakai:ts.filter(function(t){return t.Status==='TERPAKAI';}).length},Sesi:{total:se.length,selesai:se.filter(function(s){return s.Status==='SELESAI';}).length,berjalan:se.filter(function(s){return s.Status==='BERJALAN';}).length},RataRata:se.length?se.reduce(function(a,s){return a+(Number(s.Skor)||0);},0)/se.length:null,KKMEfektif:Number(p.KKM)||75,NamaPemilik:owners[p.Pemilik]||''});
  });
  return ok_({rows:rows,total:rows.length,mapelGuru:mapelGuru,kelasGuru:kelasGuru,kpi:{total:rows.length,aktif:rows.filter(function(p){return p.StatusTampil==='Berlangsung';}).length,terjadwal:rows.filter(function(p){return p.StatusTampil==='Terjadwal';}).length,draf:rows.filter(function(p){return p.StatusTampil==='Draf';}).length,tokenAktif:rows.reduce(function(a,p){return a+p.Token.aktif;},0),soalTerdistribusi:rows.reduce(function(a,p){return a+p.JumlahPool;},0),sesiBerjalan:rows.reduce(function(a,p){return a+p.Sesi.berjalan;},0)}});
}
function savePackage_(session,x,gen) {
  requireRole_(session,['ADMIN','GURU']);if(!String(x.Nama||'').trim())return fail_('VALIDATION','Nama paket wajib diisi.');
  const old=x.ID?byId_('Paket',x.ID):null;if(old&&!canManagePackage_(session,old))return fail_('AUTH','Tidak berhak mengubah paket ini.');
  const targetClasses=csv_(x.KelasSasaran===undefined&&old?old.KelasSasaran:x.KelasSasaran);
  if(session.me.role!=='ADMIN'&&(!targetClasses.length||targetClasses.some(function(k){return (session.me.kelasDiampu||[]).indexOf(k)<0;})))return fail_('AUTH','Guru hanya dapat membuat paket untuk kelas yang diampu.');
  const setting=settings_(),examKkm=Number(x.KKM)||effectiveKkm_(x.Mapel,x.Tingkat)||Number(setting.KKM_DEFAULT)||75;
  const p=Object.assign({},old||{},x,{ID:x.ID||uid_(),Kode:x.Kode||old&&old.Kode||shortCode_(),Pemilik:session.me.role==='ADMIN'?(x.Pemilik||old&&old.Pemilik||session.me.id):session.me.id,SoalIDs:Array.isArray(x.SoalIDs)?x.SoalIDs.join(','):String(x.SoalIDs||''),KelasSasaran:csv_(x.KelasSasaran).join(','),JumlahSoal:Number(x.JumlahSoal)||csv_(x.SoalIDs||x.DaftarSoal).length,Durasi:Number(x.Durasi)||60,KKM:examKkm,AntiCheat:x.AntiCheat||setting.ANTI_CHEAT||'YA',SingleDevice:x.SingleDevice||setting.SINGLE_DEVICE||'YA',MaksPelanggaran:Number(x.MaksPelanggaran)||Number(setting.MAKS_PELANGGARAN)||5,TampilNilai:x.TampilNilai==='IKUT'||!x.TampilNilai?setting.TAMPIL_NILAI||'YA':x.TampilNilai,IzinPembahasan:x.IzinPembahasan==='IKUT'||!x.IzinPembahasan?setting.IZIN_PEMBAHASAN||'YA':x.IzinPembahasan,Status:x.Status||'Draf',Dibuat:old&&old.Dibuat||x.Dibuat||iso_()});upsert_('Paket',p,'ID');if(gen&&p.Status==='Terbit')generateTokens_(session,p.ID,csv_(p.KelasSasaran));return ok_({id:p.ID,kode:p.Kode});
}
function deletePackage_(session,id){const p=byId_('Paket',id);if(!p)return fail_('DATA','Paket tidak ditemukan.');if(session.me.role!=='ADMIN'&&p.Pemilik!==session.me.id)return fail_('AUTH','Tidak berhak mengubah paket.');if(rows_('Sesi').some(function(s){return s.PaketID===id;})){p.Status='Arsip';upsert_('Paket',p,'ID');}else{rows_('Token').filter(function(t){return t.PaketID===id;}).forEach(function(t){deleteById_('Token',t.ID);});deleteById_('Paket',id);}return ok_({});}
function tokenList_(session,pid){const p=byId_('Paket',pid);if(!p)return fail_('DATA','Paket tidak ditemukan.');if(!canManagePackage_(session,p))return fail_('AUTH','Tidak berhak melihat token.');const rows=rows_('Token').filter(function(t){return t.PaketID===pid;}).map(function(t){const s=byId_('Siswa',t.SiswaID);return Object.assign({},t,{Nama:s&&s.Nama||'',Kelas:s&&s.Kelas||''});});return ok_({rows:rows,total:rows.length});}
function generateTokens_(session,pid,kelas){const p=byId_('Paket',pid);if(!p)return fail_('DATA','Paket tidak ditemukan.');if(session.me.role!=='ADMIN'&&p.Pemilik!==session.me.id)return fail_('AUTH','Tidak berhak membuat token.');const cls=(kelas||[]).map(String),packageClasses=csv_(p.KelasSasaran),allowed=session.me.kelasDiampu||[];if(session.me.role!=='ADMIN'&&(!packageClasses.length||packageClasses.some(function(k){return allowed.indexOf(k)<0;})||cls.some(function(k){return allowed.indexOf(k)<0||packageClasses.indexOf(k)<0;})))return fail_('AUTH','Pembuatan token dibatasi ke kelas paket yang Anda ampu.');const existing=rows_('Token').filter(function(t){return t.PaketID===pid;}).map(function(t){return t.SiswaID;});const students=rows_('Siswa').filter(function(s){return s.StatusAktif!=='TIDAK'&&(!cls.length||cls.indexOf(s.Kelas)>=0)&&(!packageClasses.length||packageClasses.indexOf(s.Kelas)>=0)&&existing.indexOf(s.ID)<0;});students.forEach(function(s){upsert_('Token',{ID:uid_(),PIN:randomPin_(),PaketID:pid,SiswaID:s.ID,NIS:s.NIS,Status:'AKTIF',Dibuat:iso_(),Dipakai:'',ResetAt:'',DeviceID:''},'ID');});return ok_({dibuat:students.length});}
function tokenAction_(session,d){requireRole_(session,['ADMIN','GURU']);const ids=d.ids||[];if(d.aksi==='kirimWA')return fail_('NOTIF','Pengiriman WhatsApp belum tersedia pada backend ini.');ids.forEach(function(id){const t=byId_('Token',id);if(!t)return;const p=byId_('Paket',t.PaketID);if(!canManagePackage_(session,p))throw new Error('AUTH: Tidak berhak mengubah token paket ini.');if(d.aksi==='gantiPIN'){t.PIN=randomPin_();t.Status='AKTIF';t.DeviceID='';}else if(d.aksi==='resetPerangkat'){t.ResetAt=String(Date.now());t.DeviceID='';}else if(d.aksi==='anulir'){t.Status='ANULIR';}else return;upsert_('Token',t,'ID');});return ok_({});}

function reportPackage_(session,pid){const p=byId_('Paket',pid);if(!p)return fail_('DATA','Paket tidak ditemukan.');if(!canManagePackage_(session,p))return fail_('AUTH','Tidak berhak melihat rekap paket ini.');const ses=rows_('Sesi').filter(function(s){return s.PaketID===pid;});const rows=ses.map(function(s){const st=byId_('Siswa',s.SiswaID);return {sesiId:s.ID,siswaId:s.SiswaID,nama:st&&st.Nama||'',nis:st&&st.NIS||'',kelas:st&&st.Kelas||'',paket:p.Nama,mapel:p.Mapel,kode:p.Kode,benar:Number(s.Benar)||0,salah:Number(s.Salah)||0,kosong:Number(s.Kosong)||0,skor:s.Skor===''?null:Number(s.Skor),menit:Math.round((Number(s.DurasiDetik)||0)/60),pelanggaran:Number(s.Pelanggaran)||0,selesai:s.Selesai||'',status:s.Status};});const scores=rows.filter(function(r){return r.skor!==null;}).map(function(r){return r.skor;});const avg=scores.length?scores.reduce(function(a,x){return a+x;},0)/scores.length:null;return ok_({paket:{id:p.ID,nama:p.Nama,kode:p.Kode,mapel:p.Mapel,kelas:p.KelasSasaran,kkm:Number(p.KKM)||75},rows:rows,kpi:{peserta:rows.length,selesai:scores.length,rata:avg,deviasi:0,tertinggi:scores.length?{skor:Math.max.apply(null,scores)}:null,terendah:scores.length?{skor:Math.min.apply(null,scores)}:null,lulus:scores.filter(function(x){return x>=(Number(p.KKM)||75);}).length,remedial:scores.filter(function(x){return x<(Number(p.KKM)||75);}).length,ketuntasan:scores.length?Math.round(scores.filter(function(x){return x>=(Number(p.KKM)||75);}).length/scores.length*100):0},butir:{kr20:0}});}
function reportGlobal_(session){const ids=rows_('Paket').filter(function(p){return canManagePackage_(session,p);}).map(function(p){return p.ID;});return ok_({rows:ids.map(function(id){return reportPackage_(session,id).data;}).filter(Boolean).reduce(function(a,x){return a.concat(x.rows.map(function(r){return Object.assign({},r,{paket:x.paket.nama});}));},[])});}
function monitor_(session,pid) {
  requireRole_(session,['ADMIN','GURU']);const packages=rows_('Paket').filter(function(p){return canManagePackage_(session,p)&&p.Status!=='Draf'&&p.Status!=='Arsip';}),list=packages.map(function(p){return {id:p.ID,nama:p.Nama,kode:p.Kode,status:displayStatus_(p)};});
  const p=packages.filter(function(x){return x.ID===pid;})[0]||packages[0];if(!p)return ok_({paket:null,daftarPaket:[],rows:[],stats:{total:0,mengerjakan:0,selesai:0,belum:0,pelanggaran:0,terputus:0,rataDetikPerSoal:0},feed:[],pengawas:{nama:session.me.nama,nip:''},waktuServer:Date.now()});
  const now=Date.now(),qs=questionsForPackage_(p),tokens=rows_('Token').filter(function(t){return t.PaketID===p.ID;}),allSessions=rows_('Sesi'),rows=tokens.map(function(t){
    const s=allSessions.filter(function(x){return x.TokenID===t.ID||x.PaketID===p.ID&&x.SiswaID===t.SiswaID;})[0],st=byId_('Siswa',t.SiswaID),last=s&&new Date(s.LastSeen||s.Mulai||0).getTime()||0,answers=s?parse_(s.Jawaban,{}):{};
    let status=!s?(t.Status==='TERPAKAI'?'Sudah Login':'Belum Login'):s.Status==='SELESAI'?'Selesai':last&&now-last>90000?'Koneksi Terputus':Number(s.Pelanggaran)>0?'Perlu Perhatian':'Mengerjakan';
    const logs=String(s&&s.LogPelanggaran||'').split('\n').filter(Boolean).map(function(x){const m=x.match(/^(\S+)\s+(.*)$/);return {t:m?new Date(m[1]).getTime():now,e:m?m[2]:x};});
    return {tokenId:t.ID,sesiId:s&&s.ID||'',nama:st&&st.Nama||'',nis:st&&st.NIS||'',kelas:st&&st.Kelas||'',pin:t.PIN,status:status,mulai:s&&new Date(s.Mulai).getTime()||null,lastSeen:last||null,selesai:s&&new Date(s.Selesai).getTime()||null,skor:s&&s.Skor!==''?Number(s.Skor):null,cara:s&&s.Cara||'',jumlah:qs.length,dijawab:Object.keys(answers).length,progres:Object.keys(answers).length,sisaMs:s&&s.Status==='BERJALAN'?Math.max(0,new Date(s.Deadline).getTime()-now):0,pel:Number(s&&s.Pelanggaran)||0,log:logs,koneksi:last&&now-last>90000?'Terputus':'Normal'};
  });
  const running=rows.filter(function(r){return ['Mengerjakan','Perlu Perhatian','Koneksi Terputus'].indexOf(r.status)>=0;}),done=rows.filter(function(r){return r.status==='Selesai';}),viol=rows.reduce(function(a,r){return a+r.pel;},0),disc=rows.filter(function(r){return r.status==='Koneksi Terputus';}).length;
  const feed=readFeed_('UK_FEED_'+p.ID)||[];return ok_({paket:{id:p.ID,nama:p.Nama,kode:p.Kode,mapel:p.Mapel,kelas:p.KelasSasaran,buka:p.WaktuBuka,tutup:p.WaktuTutup,durasi:Number(p.Durasi)||60},daftarPaket:list,rows:rows,stats:{total:rows.length,mengerjakan:running.length,selesai:done.length,belum:rows.filter(function(r){return r.status==='Belum Login'||r.status==='Sudah Login';}).length,pelanggaran:viol,terputus:disc,rataDetikPerSoal:0},feed:feed.slice(0,40),pengawas:{nama:session.me.nama,nip:''},siaran:readFeed_('UK_BROADCAST_'+p.ID),waktuServer:now});
}
function monitorAction_(session,d) {
  requireRole_(session,['ADMIN','GURU']);const p=byId_('Paket',d.paketId);if(!canManagePackage_(session,p))return fail_('AUTH','Tidak berhak mengelola paket ini.');const action=String(d.aksi||'');
  if(action==='siaran'){const msg=String(d.pesan||'').trim();if(!msg)return fail_('VALIDATION','Pesan siaran wajib diisi.');const item={id:uid_(),pesan:msg,t:Date.now(),oleh:session.me.nama};writeFeed_('UK_BROADCAST_'+p.ID,item);return ok_({});}
  if(action==='kunciSemua'){const active=rows_('Sesi').filter(function(s){return s.PaketID===p.ID&&s.Status==='BERJALAN';});active.forEach(function(s){submitExam_({me:session.me,student:false,sesiId:s.ID},{j:parse_(s.Jawaban,{}),r:parse_(s.Ragu,[]),seq:s.Seq},true,'Pengawas');});audit_(session,'monitor.kunciSemua',p.Nama+' · '+active.length+' sesi');return ok_({ditutup:active.length});}
  const ids=d.sesiIds||[],items=ids.map(function(id){return byId_('Sesi',id);}).filter(function(s){return s&&s.PaketID===p.ID;});if(!items.length)return fail_('DATA','Sesi ujian tidak ditemukan.');
  if(action==='peringatan'){const msg=String(d.pesan||'').trim();if(!msg)return fail_('VALIDATION','Pesan peringatan wajib diisi.');items.forEach(function(s){writeFeed_('UK_WARN_'+s.ID,{id:uid_(),pesan:msg,t:Date.now()});});}
  else if(action==='tambahWaktu'){const minutes=Math.max(1,Math.min(120,Number(d.menit)||0));if(!minutes)return fail_('VALIDATION','Jumlah menit tambahan tidak valid.');items.forEach(function(s){if(s.Status==='BERJALAN'){s.Deadline=iso_(new Date(s.Deadline).getTime()+minutes*60000);upsert_('Sesi',s,'ID');}});}
  else if(action==='paksaKirim'){items.forEach(function(s){if(s.Status==='BERJALAN')submitExam_({me:session.me,student:false,sesiId:s.ID},{j:parse_(s.Jawaban,{}),r:parse_(s.Ragu,[]),seq:s.Seq},true,'Pengawas');});}
  else return fail_('UNSUPPORTED','Aksi monitoring tidak dikenal.');
  audit_(session,'monitor.'+action,p.Nama+' · '+items.length+' sesi');return ok_({});
}
function announceResults_(session,d) {
  requireRole_(session,['ADMIN','GURU']);const p=byId_('Paket',d.paketId);if(!canManagePackage_(session,p))return fail_('AUTH','Tidak berhak mengelola paket ini.');
  const kind=d.jenis==='remedial'?'remedial':'nilai';if(kind==='nilai'){p.TampilNilai='YA';upsert_('Paket',p,'ID');}
  const item={ID:uid_(),Jenis:'pengumuman',Judul:kind==='nilai'?'Nilai ujian diumumkan: '+p.Nama:'Informasi remedial: '+p.Nama,Isi:kind==='nilai'?'Nilai ujian sudah dapat dilihat di portal siswa.':'Silakan menghubungi guru mata pelajaran untuk informasi remedial.',Sasaran:p.KelasSasaran||'Semua',PaketID:p.ID,Kelas:p.KelasSasaran||'',Aktif:'YA',Oleh:session.me.id,Dibuat:iso_(),Diperbarui:iso_()};upsert_('Info',item,'ID');audit_(session,'rekap.umumkan',p.Nama+' · '+kind);
  const res=ok_({id:item.ID,portal:true,whatsapp:false});res.message='Pengumuman ditampilkan di portal siswa. Pengiriman WhatsApp belum tersedia pada backend ini.';return res;
}
function crmCanAccess_(session,c){if(!c)return false;if(session.me.role==='ADMIN')return true;if(c.Sumber==='Data Pengguna')return c.SourceID===session.me.id;const allowed=session.me.kelasDiampu||[],classes=csv_(c.Kelas);return classes.some(function(name){return allowed.indexOf(name)>=0;});}
function crmRows_(session){return rows_('CRM').filter(function(c){return !c.MergedInto&&crmCanAccess_(session,c);}).map(function(c){c.Tag=c.Tags||'';c.StatusWA=c.StatusWA||'belum';c.JumlahPesan=Number(c.JumlahPesan)||0;c.EmailValid=c.EmailValid|| (c.Email?'YA':'');return c;});}
function crmSync_(session){requireRole_(session,['ADMIN','GURU']);const existing=rows_('CRM'),make=function(id,name,no,email,segmen,source,kelas,sourceId){if(!name)return;const old=existing.filter(function(c){return c.ID===id;})[0]||{};upsert_('CRM',Object.assign({},old,{ID:id,Nama:name,NoWA:no||'',Email:email||'',Segmen:segmen,Sumber:source,Kelas:kelas||'',Jenis:segmen,Manual:'TIDAK',SourceID:sourceId||'',OptOut:old.OptOut||'TIDAK',StatusWA:old.StatusWA||'belum',Updated:iso_()}),'ID');};
  rows_('Siswa').forEach(function(s){make('siswa:'+s.ID,s.Nama,s.NoWA,s.Email,'Siswa','Data Siswa',s.Kelas,s.ID);if(s.NamaWali||s.NoWAWali)make('wali:'+s.ID,s.NamaWali,s.NoWAWali,'','Wali','Data Wali',s.Kelas,s.ID);});
  rows_('Users').forEach(function(u){make('user:'+u.ID,u.Nama,u.NoWA,u.Email,u.Role==='ADMIN'?'Admin':'Guru','Data Pengguna',String(u.KelasDiampu||''),u.ID);});
  PropertiesService.getScriptProperties().setProperty('CRM_SYNC_AT',iso_());audit_(session,'crm.sync','sinkron siswa, wali, staf');return ok_({total:crmRows_(session).length});}
function crmStats_(session){requireRole_(session,['ADMIN','GURU']);const rows=crmRows_(session),counts={};rows.forEach(function(c){counts[c.Segmen||'Lainnya']=(counts[c.Segmen||'Lainnya']||0)+1;});const keyCount={};rows.forEach(function(c){const k=String(c.NoWA||'').replace(/\D/g,'');if(k)keyCount[k]=(keyCount[k]||0)+1;});const dup=rows.filter(function(c){return c.NoWA&&keyCount[String(c.NoWA).replace(/\D/g,'')]>1;}).length,cut=Date.now()-30*86400000;const logs=rows_('CRMLog').filter(function(l){return new Date(l.Waktu).getTime()>=cut;}).length;return ok_({total:rows.length,baru7:rows.filter(function(c){return new Date(c.Tanggal||c.Updated||0).getTime()>=Date.now()-7*86400000;}).length,waValid:rows.filter(function(c){return String(c.NoWA||'').replace(/\D/g,'').length>=9;}).length,terdaftarWA:rows.filter(function(c){return c.StatusWA==='Terdaftar';}).length,belumCekWA:rows.filter(function(c){return !c.StatusWA||c.StatusWA==='belum';}).length,emailValid:rows.filter(function(c){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.Email||''));}).length,dihubungi30:logs,duplikat:dup,tanpaKontak:rows.filter(function(c){return !c.NoWA&&!c.Email;}).length,optOut:rows.filter(function(c){return c.OptOut==='YA';}).length,syncTerakhir:PropertiesService.getScriptProperties().getProperty('CRM_SYNC_AT')||''});}
function crmList_(session,d){requireRole_(session,['ADMIN','GURU']);let rows=crmRows_(session);const duplicateMap={};rows.forEach(function(c){const phone=String(c.NoWA||'').replace(/\D/g,'');if(phone)duplicateMap[phone]=(duplicateMap[phone]||0)+1;});rows=rows.map(function(c){c.Duplikat=c.NoWA&&duplicateMap[String(c.NoWA).replace(/\D/g,'')]>1?'YA':'';return c;});if(d.segmen)rows=rows.filter(function(c){return c.Segmen===d.segmen;});if(d.statusWA)rows=rows.filter(function(c){return c.StatusWA===d.statusWA;});if(d.tag)rows=rows.filter(function(c){return csv_(c.Tags).indexOf(d.tag)>=0;});if(d.optOut==='YA')rows=rows.filter(function(c){return c.OptOut==='YA';});if(d.duplikat)rows=rows.filter(function(c){return c.Duplikat==='YA';});if(d.tanpaKontak)rows=rows.filter(function(c){return !c.NoWA&&!c.Email;});if(d.cari){const q=String(d.cari).toLowerCase();rows=rows.filter(function(c){return [c.Nama,c.Email,c.NoWA,c.Kelas,c.Sumber].join(' ').toLowerCase().indexOf(q)>=0;});}const tags={},seg={};crmRows_(session).forEach(function(c){if(c.Segmen)seg[c.Segmen]=(seg[c.Segmen]||0)+1;csv_(c.Tags).forEach(function(t){tags[t]=1;});});const total=rows.length,per=Math.max(1,Math.min(100,Number(d.per)||50)),page=Math.max(1,Number(d.halaman)||1);return ok_({rows:rows.slice((page-1)*per,page*per),total:total,per:per,halaman:page,tags:Object.keys(tags).sort(),facet:{segmen:seg}});}
function crmDetail_(session,id){const c=crmRows_(session).filter(function(x){return x.ID===id;})[0];if(!c)return fail_('DATA','Kontak tidak ditemukan.');const timeline=rows_('CRMLog').filter(function(l){return l.KontakID===id;}).sort(function(a,b){return String(b.Waktu).localeCompare(String(a.Waktu));}).map(function(l){return {kanal:l.Kanal,arah:l.Aksi||'Catatan',t:l.Waktu,ringkasan:l.Ringkasan,status:l.Status||'',oleh:l.Oleh||''};});return ok_({kontak:c,timeline:timeline});}
function crmSave_(session,input){requireRole_(session,['ADMIN','GURU']);const c=byId_('CRM',input.ID);if(!c)return fail_('DATA','Kontak tidak ditemukan.');if(!crmCanAccess_(session,c))return fail_('AUTH','Kontak berada di luar kelas atau akun yang Anda kelola.');const out=Object.assign({},c,{Nama:String(input.Nama||c.Nama),NoWA:String(input.NoWA||''),Email:String(input.Email||''),Tags:String(input.Tag||input.Tags||''),Catatan:String(input.Catatan||''),OptOut:input.OptOut==='YA'?'YA':'TIDAK',Updated:iso_()});upsert_('CRM',out,'ID');if(c.SourceID&&c.Sumber==='Data Siswa'){const s=byId_('Siswa',c.SourceID);if(s){s.Nama=out.Nama;s.NoWA=out.NoWA;s.Email=out.Email;upsert_('Siswa',s,'ID');}}else if(c.SourceID&&c.Sumber==='Data Wali'){const s=byId_('Siswa',c.SourceID);if(s){s.NamaWali=out.Nama;s.NoWAWali=out.NoWA;upsert_('Siswa',s,'ID');}}else if(c.SourceID&&c.Sumber==='Data Pengguna'){const u=byId_('Users',c.SourceID);if(u){u.Nama=out.Nama;u.NoWA=out.NoWA;u.Email=out.Email;upsert_('Users',u,'ID');}}return ok_({});}
function crmInteraction_(session,d){requireRole_(session,['ADMIN','GURU']);const c=byId_('CRM',d.kontakId);if(!crmCanAccess_(session,c))return fail_('AUTH','Kontak berada di luar kelas atau akun yang Anda kelola.');const text=String(d.ringkasan||'').trim();if(!text)return fail_('VALIDATION','Ringkasan interaksi wajib diisi.');upsert_('CRMLog',{ID:uid_(),KontakID:d.kontakId,Waktu:iso_(),Kanal:String(d.kanal||'Catatan'),Ringkasan:text,Aksi:'Catatan',Status:'',Oleh:session.me.nama},'ID');return ok_({});}
function crmMerge_(session,d){requireRole_(session,['ADMIN','GURU']);const main=byId_('CRM',d.utama);if(!crmCanAccess_(session,main))return fail_('AUTH','Kontak utama berada di luar kelas yang Anda kelola.');const source=(d.gabung||[]).map(function(id){return byId_('CRM',id);}).filter(function(c){return c&&c.ID!==main.ID;});if(source.some(function(c){return !crmCanAccess_(session,c);}))return fail_('AUTH','Sebagian kontak berada di luar kelas yang Anda kelola.');source.forEach(function(c){main.Tags=Array.from(new Set(csv_(main.Tags).concat(csv_(c.Tags)))).join(',');if(c.Catatan)main.Catatan=String(main.Catatan||'')+'\n'+c.Catatan;rows_('CRMLog').filter(function(l){return l.KontakID===c.ID;}).forEach(function(l){l.KontakID=main.ID;upsert_('CRMLog',l,'ID');});c.MergedInto=main.ID;upsert_('CRM',c,'ID');});main.Updated=iso_();upsert_('CRM',main,'ID');return ok_({});}
function crmBulk_(session,d){requireRole_(session,['ADMIN','GURU']);const ids=d.ids||[],action=d.aksi,tag=String(d.nilai||'').trim(),targets=ids.map(function(id){return byId_('CRM',id);}).filter(Boolean);if(targets.some(function(c){return !crmCanAccess_(session,c);}))return fail_('AUTH','Sebagian kontak berada di luar kelas yang Anda kelola.');ids.forEach(function(id){const c=byId_('CRM',id);if(!c)return;if(action==='tag'&&tag)c.Tags=Array.from(new Set(csv_(c.Tags).concat(csv_(tag)))).join(',');else if(action==='untag')c.Tags=csv_(c.Tags).filter(function(t){return t!==tag;}).join(',');else if(action==='optout')c.OptOut='YA';else if(action==='optin')c.OptOut='TIDAK';else if(action==='hapusManual'&&c.Manual==='YA'){deleteById_('CRM',id);return;}else if(action==='deteksiWA')return;c.Updated=iso_();upsert_('CRM',c,'ID');});if(action==='deteksiWA')return fail_('NOTIF','Pengecekan WhatsApp memerlukan integrasi Fonnte yang belum tersedia.');return ok_({});}
function crmImport_(session,input){requireRole_(session,['ADMIN','GURU']);let added=0,updated=0;for(const r of(input||[])){const phone=String(r.wa||r.NoWA||'').trim(),email=String(r.email||r.Email||'').trim(),name=String(r.nama||r.Nama||'').trim(),classes=csv_(r.kelas||r.Kelas||'');if(!name)continue;if(session.me.role!=='ADMIN'&&(!classes.length||!classes.some(function(k){return (session.me.kelasDiampu||[]).indexOf(k)>=0;})))return fail_('AUTH','Impor kontak guru wajib mencantumkan kelas yang diampu.');const old=rows_('CRM').filter(function(c){return (phone&&c.NoWA===phone)||(email&&String(c.Email).toLowerCase()===email.toLowerCase());})[0];if(old&&!crmCanAccess_(session,old))return fail_('AUTH','Kontak yang cocok berada di luar kelas yang Anda kelola.');const c=Object.assign({},old||{ID:uid_(),Manual:'YA',Jenis:r.segmen||'Kontak',Sumber:'Manual',OptOut:'TIDAK',StatusWA:'belum'}, {Nama:name,NoWA:phone,Email:email,Segmen:r.segmen||'Kontak',Tags:String(r.tag||r.Tags||''),Kelas:classes.join(','),Updated:iso_(),Tanggal:old&&old.Tanggal||iso_()});if(old)updated++;else added++;upsert_('CRM',c,'ID');}return ok_({baru:added,diperbarui:updated});}

function questionsForPackage_(p){if(!p)return[];const ids=String(p.SoalIDs||'').split(',').filter(Boolean);const all=rows_('Soal').filter(function(q){return q.Status!=='Arsip';});return ids.length?ids.map(function(id){return all.filter(function(q){return q.ID===id;})[0];}).filter(Boolean):all.filter(function(q){return q.Mapel===p.Mapel&&(!p.Tingkat||q.Tingkat===p.Tingkat);}).slice(0,Number(p.JumlahSoal)||20);}
function displayStatus_(p){if(p.Status==='Draf')return'Draf';if(p.Status==='Arsip')return'Arsip';const n=Date.now();if(n<new Date(p.WaktuBuka).getTime())return'Terjadwal';if(n<=new Date(p.WaktuTutup).getTime())return'Berlangsung';return'Selesai';}
function resultObject_(s){return {sesiId:s.ID,skor:Number(s.Skor)||0,benar:Number(s.Benar)||0,salah:Number(s.Salah)||0,kosong:Number(s.Kosong)||0};}

function ensure_(){if(!PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'))throw new Error('Backend belum disiapkan. Jalankan setupAppEnvironment dari editor Apps Script.');}
function auth_(token,student){ensure_();const raw=token&&CacheService.getScriptCache().get('uk:'+token);if(!raw)throw new Error('AUTH: Sesi tidak valid atau sudah berakhir.');const s=JSON.parse(raw);if(!!s.student!==!!student)throw new Error('AUTH: Jenis sesi tidak sesuai.');const props=PropertiesService.getScriptProperties();if(Number(s.sessionRev||0)!==Number(props.getProperty('SESSION_REV')||0))throw new Error('AUTH: Sesi dicabut. Masuk kembali.');if(s.student&&s.tokenId){const t=byId_('Token',s.tokenId);if(!t||t.Status==='ANULIR'||Number(s.issuedAt||0)<Number(t.ResetAt||0))throw new Error('AUTH: Token masuk direset oleh pengawas. Masuk kembali.');}if(!s.student&&Number(s.userRev||0)!==Number(props.getProperty('USER_REV_'+s.me.id)||0))throw new Error('AUTH: Sesi akun dicabut. Masuk kembali.');s.token=token;return s;}
function requireRole_(s,roles){if(s.student||roles.indexOf(s.me.role)<0)throw new Error('AUTH: Aksi ini tidak diizinkan untuk akun Anda.');}
function issue_(me,student,tokenId){const token=Utilities.getUuid()+Utilities.getUuid(),now=Date.now(),props=PropertiesService.getScriptProperties(),ses={me:me,student:student,issuedAt:now,sessionRev:Number(props.getProperty('SESSION_REV')||0)};if(student){const t=byId_('Token',tokenId)||rows_('Token').filter(function(x){return x.PIN&&x.SiswaID===me.siswa.id&&x.PaketID===me.paket;})[0];ses.tokenId=t&&t.ID||'';ses.tokenResetAt=Number(t&&t.ResetAt||0);const ss=t&&rows_('Sesi').filter(function(x){return x.TokenID===t.ID;})[0];ses.sesiId=ss&&ss.ID||'';}else ses.userRev=Number(props.getProperty('USER_REV_'+me.id)||0);CacheService.getScriptCache().put('uk:'+token,JSON.stringify(ses),28800);return token;}
function settings_(){const o=Object.assign({},UK.defaults);rows_('Settings').forEach(function(r){o[r.Kunci]=r.Nilai;});return o;}
function rows_(name){ensure_();const sh=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')).getSheetByName(name);if(!sh||sh.getLastRow()<2)return[];const values=sh.getRange(1,1,sh.getLastRow(),sh.getLastColumn()).getValues(),heads=values.shift();return values.filter(function(r){return r.some(function(v){return v!==''&&v!==null;});}).map(function(r){const o={};heads.forEach(function(h,i){if(h)o[h]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;});}
function upsert_(name,obj,key){ensure_();const ss=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')),sh=ss.getSheetByName(name);if(!sh)throw new Error('Sheet tidak ditemukan: '+name);const width=Math.max(sh.getLastColumn(),1),heads=sh.getRange(1,1,1,width).getValues()[0].filter(String),rows=rows_(name),id=obj[key],ix=rows.findIndex(function(r){return String(r[key])===String(id);});if(heads.indexOf(key)<0)throw new Error('Kolom kunci tidak ditemukan: '+name+'.'+key);const row=heads.map(function(h){return obj[h]===undefined?'':obj[h];});if(ix>=0)sh.getRange(ix+2,1,1,heads.length).setValues([row]);else sh.appendRow(row);}
function byId_(name,id){return rows_(name).filter(function(r){return String(r.ID)===String(id);})[0]||null;}
function deleteById_(name,id){const ss=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')),sh=ss.getSheetByName(name),r=rows_(name),i=r.findIndex(function(x){return String(x.ID)===String(id);});if(i>=0)sh.deleteRow(i+2);}
function deleteByKey_(name,key,value){const ss=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')),sh=ss.getSheetByName(name),r=rows_(name),i=r.findIndex(function(x){return String(x[key])===String(value);});if(i>=0)sh.deleteRow(i+2);}
function audit_(s,action,detail){try{upsert_('Audit',{Waktu:iso_(),UserID:s.me&&s.me.id||'',Username:s.me&&s.me.username||'',Aksi:action,Detail:detail},'Waktu');}catch(e){}}
function hash_(text,salt){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(text)));}
function uid_(){return Utilities.getUuid();}
function iso_(v){return new Date(v||Date.now()).toISOString();}
function parse_(s,d){try{return JSON.parse(s||'');}catch(e){return d;}}
function csv_(v){return Array.isArray(v)?v.map(String).filter(Boolean):String(v||'').split(/\s*,\s*/).filter(Boolean);}
function attemptsLocked_(key,max){return Number(CacheService.getScriptCache().get(key)||0)>=max;}
function recordAttempt_(key,minutes){const cache=CacheService.getScriptCache(),n=Number(cache.get(key)||0)+1;cache.put(key,String(n),Math.max(60,minutes*60));return n;}
function canManagePackage_(session,p){return !!p&&(session.me.role==='ADMIN'||p.Pemilik===session.me.id);}
function resultsVisible_(p,now){if(!p)return false;const mode=String(p.TampilNilai||'YA');return mode==='YA'||mode!=='TIDAK'&&(mode!=='SETELAH_TUTUP'||now>=new Date(p.WaktuTutup||0).getTime());}
function readFeed_(key){return parse_(PropertiesService.getScriptProperties().getProperty(key),null);}
function writeFeed_(key,obj){PropertiesService.getScriptProperties().setProperty(key,JSON.stringify(obj));}
function appendMonitorEvents_(pid,items){if(!items.length)return;const prior=readFeed_('UK_FEED_'+pid)||[],joined=items.concat(prior).slice(0,80);writeFeed_('UK_FEED_'+pid,joined);}
function saveSecret_(session,d){requireRole_(session,['ADMIN']);const key=String(d.kunci||''),allowed=['VP_URL','VP_KODE_APP','VP_KUNCI','FONNTE_TOKEN'];if(allowed.indexOf(key)<0)return fail_('VALIDATION','Nama kunci tidak diizinkan.');const props=PropertiesService.getScriptProperties(),value=String(d.nilai||'');if(value==='__HAPUS__')props.deleteProperty(key);else if(value)props.setProperty(key,value);else return fail_('VALIDATION','Nilai rahasia wajib diisi.');audit_(session,'rahasia.simpan',key);return ok_({});}
function systemStatus_(){const props=PropertiesService.getScriptProperties(),all=props.getProperties(),secrets={};['VP_URL','VP_KODE_APP','VP_KUNCI','FONNTE_TOKEN'].forEach(function(k){const v=props.getProperty(k)||'';secrets[k]={ada:!!v,samar:v.length>8?v.slice(0,3)+'••••'+v.slice(-3):v?'••••':''};});let spreadsheetUrl='',folderUrl='';try{const id=props.getProperty('SPREADSHEET_ID');if(id)spreadsheetUrl=SpreadsheetApp.openById(id).getUrl();const folder=props.getProperty('DRIVE_ROOT_FOLDER_ID');if(folder)folderUrl=DriveApp.getFolderById(folder).getUrl();}catch(e){}const triggers=ScriptApp.getProjectTriggers().map(function(t){return t.getHandlerFunction();});return ok_({versi:UK.version,waktuServer:Date.now(),trigger:triggers,keepWarm:'off',warmLast:null,kuotaEmail:'—',ukuranProps:JSON.stringify(all).length,antrian:rows_('Notifikasi').some(function(n){return n.Status==='MENUNGGU';}),rahasia:secrets,spreadsheetUrl:spreadsheetUrl,folderUrl:folderUrl,contoh:false});}
function rotasiSecretSesi(){const p=PropertiesService.getScriptProperties();p.setProperty('SESSION_SECRET',Utilities.getUuid()+Utilities.getUuid());p.setProperty('SESSION_REV',String(Number(p.getProperty('SESSION_REV')||0)+1));return 'Secret sesi dirotasi; semua pengguna harus masuk kembali.';}
function backupFolder_(){const props=PropertiesService.getScriptProperties();let id=props.getProperty('BACKUP_FOLDER_ID');if(id){try{return DriveApp.getFolderById(id);}catch(e){props.deleteProperty('BACKUP_FOLDER_ID');}}const folder=DriveApp.createFolder('UjianKu Pro CBT - Backup');props.setProperty('BACKUP_FOLDER_ID',folder.getId());return folder;}
function backupTables_(includeSecrets){const out={};Object.keys(UK.sheets).forEach(function(name){out[name]=rows_(name).map(function(row){const r=Object.assign({},row);if(!includeSecrets&&name==='Users'){delete r.Salt;delete r.PasswordHash;}if(!includeSecrets&&name==='Token')delete r.PIN;return r;});});return out;}
function createBackup_(session){const folder=backupFolder_(),now=new Date(),payload={versi:UK.version,dibuat:now.toISOString(),tabel:backupTables_(true)},name='ujianku-backup-'+Utilities.formatDate(now,'Asia/Jakarta','yyyyMMdd-HHmmss')+'.json',file=folder.createFile(name,JSON.stringify(payload),MimeType.PLAIN_TEXT);if(session)audit_(session,'backup.buat',name);return ok_({id:file.getId(),nama:file.getName(),tanggal:file.getDateCreated().toISOString(),ukuran:file.getSize(),url:file.getUrl()});}
function backupList_(session){requireRole_(session,['ADMIN']);const folder=backupFolder_(),it=folder.getFiles(),rows=[];while(it.hasNext()){const f=it.next();if(f.getName().indexOf('ujianku-backup-')===0)rows.push({id:f.getId(),nama:f.getName(),tanggal:f.getDateCreated().toISOString(),ukuran:f.getSize(),url:f.getUrl()});}rows.sort(function(a,b){return b.tanggal.localeCompare(a.tanggal);});return ok_({rows:rows,otomatis:settings_().BACKUP_OTOMATIS==='YA',simpan:Number(settings_().BACKUP_JUMLAH)||14});}
function exportBackup_(session){requireRole_(session,['ADMIN']);const data={versi:UK.version,dibuat:iso_(),tabel:backupTables_(false)};audit_(session,'backup.json','Ekspor JSON tanpa hash sandi/salt/PIN');return ok_(data);}
function saveBackupSettings_(session,d){requireRole_(session,['ADMIN']);const count=Math.max(3,Math.min(60,Number(d.simpan)||14)),enabled=!!d.otomatis;upsert_('Settings',{Kunci:'BACKUP_OTOMATIS',Nilai:enabled?'YA':'TIDAK'},'Kunci');upsert_('Settings',{Kunci:'BACKUP_JUMLAH',Nilai:count},'Kunci');const triggers=ScriptApp.getProjectTriggers();triggers.filter(function(t){return t.getHandlerFunction()==='pekerjaHarian';}).forEach(function(t){ScriptApp.deleteTrigger(t);});if(enabled)ScriptApp.newTrigger('pekerjaHarian').timeBased().everyDays(1).atHour(2).inTimezone('Asia/Jakarta').create();return ok_({otomatis:enabled,simpan:count});}
function pekerjaHarian(){if(settings_().BACKUP_OTOMATIS==='YA')createBackup_(null);}
function restoreBackup_(session,d){requireRole_(session,['ADMIN']);if(String(d.konfirmasi||'')!=='PULIHKAN')return fail_('CONFIRM','Ketik PULIHKAN untuk melanjutkan.');if(['gabung','ganti'].indexOf(d.mode)<0)return fail_('VALIDATION','Mode pemulihan tidak valid.');createBackup_(session);const folder=backupFolder_(),file=DriveApp.getFileById(String(d.id||''));if(!file.getParents().hasNext()||file.getParents().next().getId()!==folder.getId())return fail_('AUTH','Berkas bukan backup milik aplikasi ini.');const payload=parse_(file.getBlob().getDataAsString(),null);if(!payload||!payload.tabel)return fail_('DATA','Isi backup tidak valid.');const db=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  Object.keys(UK.sheets).forEach(function(name){const incoming=payload.tabel[name]||[],sh=db.getSheetByName(name);if(!sh)return;if(d.mode==='ganti'&&sh.getLastRow()>1)sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).clearContent();const key=name==='Settings'?'Kunci':name==='KKM'?'Mapel':name==='Audit'?'Waktu':'ID';incoming.forEach(function(row){if(d.mode==='gabung'&&rows_(name).some(function(old){return String(old[key])===String(row[key]);}))return;const headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].filter(String);sh.appendRow(headers.map(function(h){return row[h]===undefined?'':row[h];}));});});audit_(session,'backup.pulihkan',file.getName()+' · '+d.mode);return ok_({});}
function randomPassword_(){return 'CbT-'+Utilities.getUuid().replace(/-/g,'').slice(0,8)+'7';}
function randomPin_(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s;}
function shortCode_(){return Utilities.getUuid().replace(/-/g,'').slice(0,8).toUpperCase();}

/**
 * Tambahkan data contoh CBT yang aman dan idempoten untuk demonstrasi.
 * Paket dibuat sebagai Draf dan pengumuman nonaktif; tidak ada token ujian
 * yang diterbitkan, sehingga siswa tidak dapat memulai ujian contoh ini.
 */
function seedDemoData(){
  ensure_();
  const kelasNama=['[DEMO] XI RPL 1','[DEMO] XI TKJ 1'];
  const hasil={kelas:0,guru:0,siswa:0,soal:0,paket:0,pengumuman:0};
  let sandiGuru='';

  let guru=rows_('Users').filter(function(u){return u.Username==='guru.demo.cbtsmk';})[0];
  if(!guru){
    sandiGuru=randomPassword_();
    const salt=Utilities.getUuid();
    guru={ID:uid_(),Nama:'Guru Demo CBT',Username:'guru.demo.cbtsmk',Role:'GURU',Salt:salt,PasswordHash:hash_(sandiGuru,salt),WajibGanti:'YA',Aktif:'YA',Mapel:'Matematika',KelasDiampu:kelasNama.join(','),Dibuat:iso_(),Email:'',NoWA:'',NIP:'DEMO'};
    upsert_('Users',guru,'ID');hasil.guru=1;
  }

  kelasNama.forEach(function(n,i){
    let k=rows_('Kelas').filter(function(x){return String(x.NamaKelas||x.Nama||'')===n;})[0];
    if(!k){k={ID:uid_(),Nama:n,NamaKelas:n,Tingkat:'XI',Wali:guru.ID,WaliKelas:guru.ID,Kapasitas:36,Ruang:'Lab CBT Demo '+(i+1),Aktif:'YA',Dibuat:iso_()};upsert_('Kelas',k,'ID');hasil.kelas++;}
  });

  const siswaContoh=[
    {Nama:'Alya Putri Demo',NIS:'DEMO-XI-001',Kelas:kelasNama[0],JenisKelamin:'P'},
    {Nama:'Bima Pratama Demo',NIS:'DEMO-XI-002',Kelas:kelasNama[0],JenisKelamin:'L'},
    {Nama:'Citra Lestari Demo',NIS:'DEMO-XI-003',Kelas:kelasNama[0],JenisKelamin:'P'},
    {Nama:'Daffa Ramadhan Demo',NIS:'DEMO-XI-004',Kelas:kelasNama[1],JenisKelamin:'L'},
    {Nama:'Nadia Safitri Demo',NIS:'DEMO-XI-005',Kelas:kelasNama[1],JenisKelamin:'P'},
    {Nama:'Rafi Akbar Demo',NIS:'DEMO-XI-006',Kelas:kelasNama[1],JenisKelamin:'L'}
  ];
  siswaContoh.forEach(function(s){
    if(!rows_('Siswa').some(function(x){return String(x.NIS)===s.NIS;})){
      s.ID=uid_();s.NISN='';s.StatusAktif='YA';s.Dibuat=iso_();s.NoWA='';s.Email='';s.NamaWali='';s.NoWAWali='';
      upsert_('Siswa',s,'ID');hasil.siswa++;
    }
  });

  const soalContoh=[
    {Mapel:'Matematika',Topik:'Persamaan Linear',Pertanyaan:'[DEMO] Jika 3x + 2 = 14, nilai x adalah …',A:'2',B:'3',C:'4',D:'5',E:'6',Kunci:'C',Pembahasan:'3x = 12, sehingga x = 4.'},
    {Mapel:'Matematika',Topik:'Pecahan',Pertanyaan:'[DEMO] Hasil dari 1/2 + 1/4 adalah …',A:'1/4',B:'3/4',C:'1',D:'1 1/4',E:'2/3',Kunci:'B',Pembahasan:'Samakan penyebut: 2/4 + 1/4 = 3/4.'},
    {Mapel:'Matematika',Topik:'Persentase',Pertanyaan:'[DEMO] 25% dari 200 adalah …',A:'25',B:'40',C:'45',D:'50',E:'75',Kunci:'D',Pembahasan:'0,25 × 200 = 50.'},
    {Mapel:'Matematika',Topik:'Geometri',Pertanyaan:'[DEMO] Persegi panjang berukuran 8 cm × 5 cm. Luasnya adalah …',A:'13 cm²',B:'26 cm²',C:'35 cm²',D:'40 cm²',E:'45 cm²',Kunci:'D',Pembahasan:'Luas = panjang × lebar = 8 × 5 = 40 cm².'},
    {Mapel:'Matematika',Topik:'Bilangan Berpangkat',Pertanyaan:'[DEMO] Nilai 2³ adalah …',A:'6',B:'8',C:'9',D:'12',E:'16',Kunci:'B',Pembahasan:'2³ = 2 × 2 × 2 = 8.'}
  ];
  const soalIds=[];
  soalContoh.forEach(function(q){
    let old=rows_('Soal').filter(function(x){return x.Pertanyaan===q.Pertanyaan;})[0];
    if(!old){q.ID=uid_();q.Tingkat='XI';q.KD='';q.Bloom='C2';q.Tipe='PG';q.URLGambar='';q.Bobot=1;q.Kesukaran='Mudah';q.Status='Aktif';q.Pemilik=guru.ID;q.Dibuat=iso_();upsert_('Soal',q,'ID');old=q;hasil.soal++;}
    soalIds.push(old.ID);
  });

  const namaPaket='[DEMO] Latihan Matematika XI';
  let paket=rows_('Paket').filter(function(p){return p.Nama===namaPaket;})[0];
  if(!paket){
    const mulai=Date.now()+86400000;
    paket={ID:uid_(),Nama:namaPaket,Kode:'DEMO-'+shortCode_().slice(0,4),Mapel:'Matematika',Tingkat:'XI',KelasSasaran:kelasNama[0],Pemilik:guru.ID,SoalIDs:soalIds.join(','),JumlahSoal:soalIds.length,WaktuBuka:iso_(mulai),WaktuTutup:iso_(mulai+7200000),Durasi:30,KKM:75,Toleransi:0,Status:'Draf',AcakSoal:'TIDAK',AcakOpsi:'TIDAK',AntiCheat:'TIDAK',SingleDevice:'YA',MaksPelanggaran:5,TampilNilai:'YA',IzinPembahasan:'YA',Dibuat:iso_()};
    upsert_('Paket',paket,'ID');hasil.paket++;
  }

  const judulInfo='[DEMO] Informasi latihan CBT';
  if(!rows_('Info').some(function(i){return i.Judul===judulInfo;})){
    upsert_('Info',{ID:uid_(),Jenis:'pengumuman',Judul:judulInfo,Isi:'Ini data simulasi. Paket latihan masih berstatus Draf dan tidak memiliki token peserta.',Deskripsi:'Data dummy untuk latihan pengelolaan CBT.',URL:'',Mapel:'Matematika',Kelas:kelasNama.join(','),Sasaran:'guru',PaketID:paket.ID,Mulai:'',Selesai:'',Aktif:'TIDAK',Oleh:guru.ID,Dibuat:iso_(),Diperbarui:iso_()},'ID');
    hasil.pengumuman++;
  }

  Logger.log(JSON.stringify(hasil));
  if(sandiGuru){Logger.log('AKUN GURU DEMO');Logger.log('Username: guru.demo.cbtsmk');Logger.log('Kata sandi awal: '+sandiGuru);}
  else Logger.log('Akun guru demo sudah ada; sandi yang lama tidak ditampilkan kembali.');
  Logger.log('Data simulasi aman: paket Draf, pengumuman nonaktif, tanpa PIN/token.');
  return hasil;
}
function ok_(data){return {success:true,data:data||{},message:''};}
function fail_(code,message){return {success:false,code:code,message:message};}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
