# Artefak AI

Letakkan `behaviour_lgbm.joblib`, `feature_cols.joblib`, dan `label_encoder.joblib`
di sini sebelum menjalankan Docker. File model dipasang read-only ke container,
bukan dibundel ke image. Folder kosong: API sensor tetap bekerja, status AI
menjelaskan model belum tersedia. Model boleh dinonaktifkan dengan AI_ENABLED=0.

File label yang sebelumnya ditemukan di C:\Eco-Herd salah isi (RandomForest,
bukan LabelEncoder). Minta file yang benar dari pembuat model. Jangan menebak
nama kelas. Notebook ekstraksi fitur asli masih diperlukan untuk validasi.
