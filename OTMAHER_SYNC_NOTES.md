# OTMAHER → Azura senkronizasyonu

Bu dosya 16.09.2026 tarihinde senkronizasyon çalışması için oluşturuldu.

Güvenlik modeli:
- OTMAHER tek veri kaynağıdır.
- Azura yalnızca GET ile veri okur.
- Azura OTMAHER'e veri yazmaz.
- Apps Script çıkışı yalnız PARAMETRELER, BIRIM_FIYATLAR ve RECETELER sekmelerini okur.
- Adisyo API anahtarları veya diğer teknik sekmeler dışarı verilmez.
