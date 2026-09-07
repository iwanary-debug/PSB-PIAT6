export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  
  const nisn = formData.get('nisn');
  const nama = formData.get('nama');
  const no_hp_wali = formData.get('no_hp_wali');

  // 1. Simpan ke D1
  await env.DB.prepare(
    "INSERT INTO santri (nisn, nama, no_hp_wali, alamat, gelombang) VALUES (?, ?, ?, ?)"
  ).bind(nisn, nama, no_hp_wali, formData.get('alamat'), formData.get('gelombang')).run();

  // 2. Upload 5 file ke R2
  const jenisBerkas = ['kk', 'ktp_ayah', 'ktp_ibu', 'raport', 'ijazah', 'sehat'];
  for (const jenis of jenisBerkas) {
    const file = formData.get(jenis);
    if (file) {
      await env.BERKAS.put(`${nisn}/${jenis}.jpg`, file);
      await env.DB.prepare(
        "INSERT INTO berkas (nisn, jenis, filename, url) VALUES (?, ?, ?, ?)"
      ).bind(nisn, jenis, file.name, `https://piat6-berkas.r2.dev/${nisn}/${jenis}.jpg`).run();
    }
  }

  // 3. Kirim WA Notif Daftar
  await fetch("URL_WAHA_SAMPEAN", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session: "default",
      chatId: no_hp_wali + "@c.us",
      text: `Assalamualaikum Bpk/Ibu ${nama}. Pendaftaran Santri Baru PIAT6 a.n ${nama} NISN ${nisn} sudah kami terima. Terima kasih.`
    })
  });

  return new Response(JSON.stringify({success: true}), {status: 200});
}
