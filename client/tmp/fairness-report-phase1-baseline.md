# RaceArena — Fairness Simulation Report

**Datum:** 2026-05-17  
**Rennen pro Kombination:** 50  
**Teilnehmer pro Rennen:** 40  
**Distanz-Varianten:** 30s / 120s  
**Catch-Up (speedBonusFactor):** 1  
**PRNG:** mulberry32, Seeds 1–50  

---

## Übersicht — Win-Rate pro Startreihe

Erwartete Win-Rate bei perfekter Fairness: **1 / Anzahl Reihen**.  
Signifikanz: Chi²-Test, H₀ = alle Reihen gleichwahrscheinlich.  
`⚠️ Front-Bias` = Row 0 gewinnt zu oft; `⚠️ Rear-Bias` = Row 0 gewinnt zu selten.  

| Track | Racer | Dist | Reihen | Erwart. | R0 WinRate | R1 WinRate | R2+ WinRate | χ² | p-Wert | Urteil |
|-------|-------|------|--------|---------|-----------|------------|-------------|-----|--------|--------|
| Dirt Oval | horse | 30s | 10 | 10.0% | 14.0% | 14.0% | 9.0% | 13.6 | n.s. | ✅ Fair |
| Dirt Oval | horse | 120s | 10 | 10.0% | 10.0% | 8.0% | 10.3% | 4.4 | n.s. | ✅ Fair |
| Dirt Oval | duck | 30s | 8 | 12.5% | 16.0% | 12.0% | 12.0% | 4.7 | n.s. | ✅ Fair |
| Dirt Oval | duck | 120s | 8 | 12.5% | 10.0% | 14.0% | 12.7% | 4.4 | n.s. | ✅ Fair |
| Dirt Oval | snail | 30s | 8 | 12.5% | 20.0% | 14.0% | 11.0% | 7.6 | n.s. | ✅ Fair |
| Dirt Oval | snail | 120s | 8 | 12.5% | 12.0% | 20.0% | 11.3% | 6.0 | n.s. | ✅ Fair |
| Dirt Oval | elephant | 30s | 10 | 10.0% | 14.0% | 12.0% | 9.3% | 3.6 | n.s. | ✅ Fair |
| Dirt Oval | elephant | 120s | 10 | 10.0% | 8.0% | 10.0% | 10.3% | 3.2 | n.s. | ✅ Fair |
| Dirt Oval | giraffe | 30s | 14 | 7.1% | 6.0% | 14.0% | 6.7% | 13.8 | n.s. | ✅ Fair |
| Dirt Oval | giraffe | 120s | 14 | 7.1% | 6.0% | 4.0% | 7.5% | 7.7 | n.s. | ✅ Fair |
| Dirt Oval | snake | 30s | 8 | 12.5% | 16.0% | 18.0% | 11.0% | 5.0 | n.s. | ✅ Fair |
| Dirt Oval | snake | 120s | 8 | 12.5% | 8.0% | 16.0% | 12.7% | 4.4 | n.s. | ✅ Fair |
| Dirt Oval | dragon | 30s | 14 | 7.1% | 6.0% | 12.0% | 6.8% | 9.4 | n.s. | ✅ Fair |
| Dirt Oval | dragon | 120s | 14 | 7.1% | 6.0% | 4.0% | 7.5% | 10.5 | n.s. | ✅ Fair |
| Dirt Oval | f1 | 30s | 10 | 10.0% | 12.0% | 14.0% | 9.3% | 6.4 | n.s. | ✅ Fair |
| Dirt Oval | f1 | 120s | 10 | 10.0% | 10.0% | 8.0% | 10.3% | 3.2 | n.s. | ✅ Fair |
| Dirt Oval | rocket | 30s | 10 | 10.0% | 12.0% | 14.0% | 9.3% | 5.2 | n.s. | ✅ Fair |
| Dirt Oval | rocket | 120s | 10 | 10.0% | 10.0% | 8.0% | 10.3% | 4.8 | n.s. | ✅ Fair |
| Dirt Oval | buggy | 30s | 10 | 10.0% | 8.0% | 12.0% | 10.0% | 11.2 | n.s. | ✅ Fair |
| Dirt Oval | buggy | 120s | 10 | 10.0% | 8.0% | 12.0% | 10.0% | 6.8 | n.s. | ✅ Fair |
| Dirt Oval | motorbike | 30s | 8 | 12.5% | 12.0% | 16.0% | 12.0% | 2.5 | n.s. | ✅ Fair |
| Dirt Oval | motorbike | 120s | 8 | 12.5% | 12.0% | 8.0% | 13.3% | 1.2 | n.s. | ✅ Fair |
| Dirt Oval | plane | 30s | 10 | 10.0% | 16.0% | 18.0% | 8.3% | 8.0 | n.s. | ✅ Fair |
| Dirt Oval | plane | 120s | 10 | 10.0% | 8.0% | 12.0% | 10.0% | 2.0 | n.s. | ✅ Fair |
| River Run | horse | 30s | 3 | 33.3% | 96.0% | 4.0% | 0.0% | 88.5 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | horse | 120s | 3 | 33.3% | 96.0% | 4.0% | 0.0% | 88.5 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | duck | 30s | 3 | 33.3% | 98.0% | 0.0% | 2.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | duck | 120s | 3 | 33.3% | 98.0% | 0.0% | 2.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | snail | 30s | 3 | 33.3% | 86.0% | 14.0% | 0.0% | 63.9 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | snail | 120s | 3 | 33.3% | 86.0% | 10.0% | 4.0% | 62.7 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | elephant | 30s | 3 | 33.3% | 86.0% | 10.0% | 4.0% | 62.7 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | elephant | 120s | 3 | 33.3% | 86.0% | 10.0% | 4.0% | 62.7 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | giraffe | 30s | 4 | 25.0% | 92.0% | 4.0% | 2.0% | 119.9 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | giraffe | 120s | 4 | 25.0% | 92.0% | 4.0% | 2.0% | 119.9 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | snake | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | snake | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | dragon | 30s | 4 | 25.0% | 90.0% | 8.0% | 1.0% | 113.4 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | dragon | 120s | 4 | 25.0% | 90.0% | 8.0% | 1.0% | 113.4 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | f1 | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | f1 | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | rocket | 30s | 3 | 33.3% | 94.0% | 6.0% | 0.0% | 83.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | rocket | 120s | 3 | 33.3% | 94.0% | 6.0% | 0.0% | 83.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | buggy | 30s | 3 | 33.3% | 94.0% | 6.0% | 0.0% | 83.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | buggy | 120s | 3 | 33.3% | 94.0% | 6.0% | 0.0% | 83.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | motorbike | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | motorbike | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | plane | 30s | 3 | 33.3% | 94.0% | 6.0% | 0.0% | 83.1 | *** (p<0.001) | ⚠️ Front-Bias |
| River Run | plane | 120s | 3 | 33.3% | 94.0% | 6.0% | 0.0% | 83.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | horse | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | horse | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | duck | 30s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | duck | 120s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | snail | 30s | 2 | 50.0% | 92.0% | 8.0% | — | 35.3 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | snail | 120s | 2 | 50.0% | 86.0% | 14.0% | — | 25.9 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | elephant | 30s | 3 | 33.3% | 96.0% | 2.0% | 2.0% | 88.4 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | elephant | 120s | 3 | 33.3% | 96.0% | 2.0% | 2.0% | 88.4 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | giraffe | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | giraffe | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | snake | 30s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | snake | 120s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | dragon | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | dragon | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | f1 | 30s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | f1 | 120s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | rocket | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | rocket | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | buggy | 30s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | buggy | 120s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | motorbike | 30s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | motorbike | 120s | 2 | 50.0% | 100.0% | 0.0% | — | 50.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | plane | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Space Sprint | plane | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Garden Path | horse | 30s | 10 | 10.0% | 8.0% | 12.0% | 10.0% | 7.2 | n.s. | ✅ Fair |
| Garden Path | horse | 120s | 10 | 10.0% | 8.0% | 4.0% | 11.0% | 8.0 | n.s. | ✅ Fair |
| Garden Path | duck | 30s | 8 | 12.5% | 16.0% | 16.0% | 11.3% | 8.2 | n.s. | ✅ Fair |
| Garden Path | duck | 120s | 8 | 12.5% | 8.0% | 12.0% | 13.3% | 1.5 | n.s. | ✅ Fair |
| Garden Path | snail | 30s | 8 | 12.5% | 16.0% | 8.0% | 12.7% | 2.5 | n.s. | ✅ Fair |
| Garden Path | snail | 120s | 8 | 12.5% | 10.0% | 12.0% | 13.0% | 1.2 | n.s. | ✅ Fair |
| Garden Path | elephant | 30s | 10 | 10.0% | 10.0% | 8.0% | 10.3% | 9.6 | n.s. | ✅ Fair |
| Garden Path | elephant | 120s | 10 | 10.0% | 6.0% | 6.0% | 11.0% | 6.4 | n.s. | ✅ Fair |
| Garden Path | giraffe | 30s | 10 | 10.0% | 8.0% | 6.0% | 10.8% | 24.0 | ** (p<0.01) | ⚠️ Unequal |
| Garden Path | giraffe | 120s | 10 | 10.0% | 6.0% | 6.0% | 11.0% | 6.0 | n.s. | ✅ Fair |
| Garden Path | snake | 30s | 8 | 12.5% | 14.0% | 12.0% | 12.3% | 3.4 | n.s. | ✅ Fair |
| Garden Path | snake | 120s | 8 | 12.5% | 10.0% | 14.0% | 12.7% | 3.8 | n.s. | ✅ Fair |
| Garden Path | dragon | 30s | 14 | 7.1% | 2.0% | 0.0% | 8.2% | 21.7 | n.s. | ✅ Fair |
| Garden Path | dragon | 120s | 14 | 7.1% | 8.0% | 4.0% | 7.3% | 11.6 | n.s. | ✅ Fair |
| Garden Path | f1 | 30s | 8 | 12.5% | 14.0% | 12.0% | 12.3% | 4.4 | n.s. | ✅ Fair |
| Garden Path | f1 | 120s | 8 | 12.5% | 10.0% | 12.0% | 13.0% | 0.9 | n.s. | ✅ Fair |
| Garden Path | rocket | 30s | 10 | 10.0% | 8.0% | 6.0% | 10.8% | 11.2 | n.s. | ✅ Fair |
| Garden Path | rocket | 120s | 10 | 10.0% | 4.0% | 8.0% | 11.0% | 4.8 | n.s. | ✅ Fair |
| Garden Path | buggy | 30s | 8 | 12.5% | 12.0% | 12.0% | 12.7% | 7.0 | n.s. | ✅ Fair |
| Garden Path | buggy | 120s | 8 | 12.5% | 8.0% | 10.0% | 13.7% | 9.5 | n.s. | ✅ Fair |
| Garden Path | motorbike | 30s | 8 | 12.5% | 12.0% | 12.0% | 12.7% | 2.2 | n.s. | ✅ Fair |
| Garden Path | motorbike | 120s | 8 | 12.5% | 10.0% | 12.0% | 13.0% | 1.2 | n.s. | ✅ Fair |
| Garden Path | plane | 30s | 10 | 10.0% | 10.0% | 12.0% | 9.8% | 4.0 | n.s. | ✅ Fair |
| Garden Path | plane | 120s | 10 | 10.0% | 6.0% | 4.0% | 11.3% | 14.0 | n.s. | ✅ Fair |
| City Circuit | horse | 30s | 10 | 10.0% | 14.0% | 14.0% | 9.0% | 11.2 | n.s. | ✅ Fair |
| City Circuit | horse | 120s | 10 | 10.0% | 10.0% | 12.0% | 9.8% | 4.0 | n.s. | ✅ Fair |
| City Circuit | duck | 30s | 8 | 12.5% | 14.0% | 22.0% | 10.7% | 7.0 | n.s. | ✅ Fair |
| City Circuit | duck | 120s | 8 | 12.5% | 10.0% | 16.0% | 12.3% | 2.5 | n.s. | ✅ Fair |
| City Circuit | snail | 30s | 8 | 12.5% | 22.0% | 14.0% | 10.7% | 7.0 | n.s. | ✅ Fair |
| City Circuit | snail | 120s | 8 | 12.5% | 14.0% | 16.0% | 11.7% | 3.8 | n.s. | ✅ Fair |
| City Circuit | elephant | 30s | 10 | 10.0% | 12.0% | 18.0% | 8.8% | 8.0 | n.s. | ✅ Fair |
| City Circuit | elephant | 120s | 10 | 10.0% | 8.0% | 6.0% | 10.8% | 12.0 | n.s. | ✅ Fair |
| City Circuit | giraffe | 30s | 14 | 7.1% | 4.0% | 10.0% | 7.2% | 14.4 | n.s. | ✅ Fair |
| City Circuit | giraffe | 120s | 14 | 7.1% | 6.0% | 4.0% | 7.5% | 10.5 | n.s. | ✅ Fair |
| City Circuit | snake | 30s | 8 | 12.5% | 16.0% | 18.0% | 11.0% | 5.0 | n.s. | ✅ Fair |
| City Circuit | snake | 120s | 8 | 12.5% | 12.0% | 18.0% | 11.7% | 7.0 | n.s. | ✅ Fair |
| City Circuit | dragon | 30s | 14 | 7.1% | 6.0% | 10.0% | 7.0% | 9.4 | n.s. | ✅ Fair |
| City Circuit | dragon | 120s | 14 | 7.1% | 6.0% | 4.0% | 7.5% | 6.6 | n.s. | ✅ Fair |
| City Circuit | f1 | 30s | 8 | 12.5% | 16.0% | 12.0% | 12.0% | 1.5 | n.s. | ✅ Fair |
| City Circuit | f1 | 120s | 8 | 12.5% | 8.0% | 12.0% | 13.3% | 2.2 | n.s. | ✅ Fair |
| City Circuit | rocket | 30s | 10 | 10.0% | 16.0% | 12.0% | 9.0% | 3.6 | n.s. | ✅ Fair |
| City Circuit | rocket | 120s | 10 | 10.0% | 8.0% | 16.0% | 9.5% | 5.2 | n.s. | ✅ Fair |
| City Circuit | buggy | 30s | 8 | 12.5% | 16.0% | 10.0% | 12.3% | 2.5 | n.s. | ✅ Fair |
| City Circuit | buggy | 120s | 8 | 12.5% | 16.0% | 16.0% | 11.3% | 5.0 | n.s. | ✅ Fair |
| City Circuit | motorbike | 30s | 8 | 12.5% | 18.0% | 14.0% | 11.3% | 5.4 | n.s. | ✅ Fair |
| City Circuit | motorbike | 120s | 8 | 12.5% | 8.0% | 14.0% | 13.0% | 5.7 | n.s. | ✅ Fair |
| City Circuit | plane | 30s | 10 | 10.0% | 8.0% | 16.0% | 9.5% | 6.0 | n.s. | ✅ Fair |
| City Circuit | plane | 120s | 10 | 10.0% | 6.0% | 6.0% | 11.0% | 4.8 | n.s. | ✅ Fair |
| Weltall | horse | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | horse | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | duck | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | duck | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | snail | 30s | 2 | 50.0% | 88.0% | 12.0% | — | 28.9 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | snail | 120s | 2 | 50.0% | 90.0% | 10.0% | — | 32.0 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | elephant | 30s | 3 | 33.3% | 96.0% | 2.0% | 2.0% | 88.4 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | elephant | 120s | 3 | 33.3% | 96.0% | 2.0% | 2.0% | 88.4 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | giraffe | 30s | 3 | 33.3% | 96.0% | 4.0% | 0.0% | 88.5 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | giraffe | 120s | 3 | 33.3% | 96.0% | 4.0% | 0.0% | 88.5 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | snake | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | snake | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | dragon | 30s | 3 | 33.3% | 96.0% | 4.0% | 0.0% | 88.5 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | dragon | 120s | 3 | 33.3% | 96.0% | 4.0% | 0.0% | 88.5 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | f1 | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | f1 | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | rocket | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | rocket | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | buggy | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | buggy | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | motorbike | 30s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | motorbike | 120s | 2 | 50.0% | 98.0% | 2.0% | — | 46.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | plane | 30s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |
| Weltall | plane | 120s | 3 | 33.3% | 98.0% | 2.0% | 0.0% | 94.1 | *** (p<0.001) | ⚠️ Front-Bias |

---

## Detail-Auswertung pro Kombination

### Dirt Oval × horse × 30s

- **finishT:** 2.1237 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 13.60 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +4.0% | 21.0 | 11.9 |
| Row 1 | 7 | 14.0% | +4.0% | 20.0 | 12.0 |
| Row 2 | 1 | 2.0% | -8.0% | 19.3 | 11.8 |
| Row 3 | 0 | 0.0% | -10.0% | 19.2 | 11.6 |
| Row 4 | 4 | 8.0% | -2.0% | 21.9 | 11.0 |
| Row 5 | 4 | 8.0% | -2.0% | 21.6 | 11.6 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 11.6 |
| Row 7 | 8 | 16.0% | +6.0% | 21.1 | 11.8 |
| Row 8 | 7 | 14.0% | +4.0% | 19.9 | 10.7 |
| Row 9 | 5 | 10.0% | +0.0% | 21.2 | 11.4 |

### Dirt Oval × horse × 120s

- **finishT:** 8.4948 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 4.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | +0.0% | 21.4 | 11.2 |
| Row 1 | 4 | 8.0% | -2.0% | 19.6 | 12.0 |
| Row 2 | 7 | 14.0% | +4.0% | 19.5 | 11.7 |
| Row 3 | 6 | 12.0% | +2.0% | 20.2 | 11.1 |
| Row 4 | 7 | 14.0% | +4.0% | 20.0 | 11.7 |
| Row 5 | 4 | 8.0% | -2.0% | 21.1 | 11.7 |
| Row 6 | 6 | 12.0% | +2.0% | 19.8 | 12.1 |
| Row 7 | 2 | 4.0% | -6.0% | 21.6 | 11.5 |
| Row 8 | 5 | 10.0% | +0.0% | 20.5 | 11.4 |
| Row 9 | 4 | 8.0% | -2.0% | 21.3 | 10.9 |

### Dirt Oval × duck × 30s

- **finishT:** 1.8051 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 4.72 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.1 | 11.9 |
| Row 1 | 6 | 12.0% | -0.5% | 20.0 | 12.0 |
| Row 2 | 6 | 12.0% | -0.5% | 19.4 | 11.9 |
| Row 3 | 8 | 16.0% | +3.5% | 21.6 | 11.4 |
| Row 4 | 9 | 18.0% | +5.5% | 21.6 | 11.7 |
| Row 5 | 6 | 12.0% | -0.5% | 20.3 | 11.3 |
| Row 6 | 4 | 8.0% | -4.5% | 20.2 | 11.0 |
| Row 7 | 3 | 6.0% | -6.5% | 20.9 | 11.1 |

### Dirt Oval × duck × 120s

- **finishT:** 7.2205 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 4.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | -2.5% | 20.9 | 11.4 |
| Row 1 | 7 | 14.0% | +1.5% | 20.1 | 11.7 |
| Row 2 | 4 | 8.0% | -4.5% | 19.9 | 11.6 |
| Row 3 | 8 | 16.0% | +3.5% | 20.1 | 11.6 |
| Row 4 | 4 | 8.0% | -4.5% | 21.0 | 11.8 |
| Row 5 | 9 | 18.0% | +5.5% | 20.9 | 11.7 |
| Row 6 | 8 | 16.0% | +3.5% | 20.1 | 11.6 |
| Row 7 | 5 | 10.0% | -2.5% | 21.1 | 11.0 |

### Dirt Oval × snail × 30s

- **finishT:** 0.6371 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 7.60 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 10 | 20.0% | +7.5% | 20.6 | 12.4 |
| Row 1 | 7 | 14.0% | +1.5% | 20.7 | 11.7 |
| Row 2 | 6 | 12.0% | -0.5% | 19.8 | 11.8 |
| Row 3 | 4 | 8.0% | -4.5% | 21.5 | 11.4 |
| Row 4 | 7 | 14.0% | +1.5% | 21.3 | 11.7 |
| Row 5 | 5 | 10.0% | -2.5% | 20.2 | 11.4 |
| Row 6 | 9 | 18.0% | +5.5% | 19.7 | 11.2 |
| Row 7 | 2 | 4.0% | -8.5% | 20.2 | 10.9 |

### Dirt Oval × snail × 120s

- **finishT:** 2.5484 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | -0.5% | 20.7 | 11.6 |
| Row 1 | 10 | 20.0% | +7.5% | 19.9 | 11.9 |
| Row 2 | 3 | 6.0% | -6.5% | 20.0 | 11.5 |
| Row 3 | 6 | 12.0% | -0.5% | 19.8 | 11.5 |
| Row 4 | 5 | 10.0% | -2.5% | 21.0 | 11.8 |
| Row 5 | 8 | 16.0% | +3.5% | 21.0 | 11.8 |
| Row 6 | 8 | 16.0% | +3.5% | 20.4 | 11.4 |
| Row 7 | 4 | 8.0% | -4.5% | 21.1 | 10.9 |

### Dirt Oval × elephant × 30s

- **finishT:** 1.2742 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 3.60 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +4.0% | 21.2 | 11.9 |
| Row 1 | 6 | 12.0% | +2.0% | 20.5 | 12.1 |
| Row 2 | 4 | 8.0% | -2.0% | 19.6 | 11.7 |
| Row 3 | 5 | 10.0% | +0.0% | 19.3 | 11.7 |
| Row 4 | 2 | 4.0% | -6.0% | 22.0 | 11.4 |
| Row 5 | 6 | 12.0% | +2.0% | 21.5 | 11.6 |
| Row 6 | 6 | 12.0% | +2.0% | 19.5 | 11.5 |
| Row 7 | 5 | 10.0% | +0.0% | 20.8 | 11.6 |
| Row 8 | 5 | 10.0% | +0.0% | 19.8 | 10.8 |
| Row 9 | 4 | 8.0% | -2.0% | 20.8 | 11.1 |

### Dirt Oval × elephant × 120s

- **finishT:** 5.0969 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 3.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.5 | 11.3 |
| Row 1 | 5 | 10.0% | +0.0% | 19.8 | 12.2 |
| Row 2 | 4 | 8.0% | -2.0% | 19.7 | 11.7 |
| Row 3 | 3 | 6.0% | -4.0% | 20.3 | 11.2 |
| Row 4 | 6 | 12.0% | +2.0% | 20.0 | 11.8 |
| Row 5 | 5 | 10.0% | +0.0% | 20.8 | 11.6 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 12.0 |
| Row 7 | 4 | 8.0% | -2.0% | 21.3 | 11.4 |
| Row 8 | 5 | 10.0% | +0.0% | 20.5 | 11.3 |
| Row 9 | 7 | 14.0% | +4.0% | 21.2 | 11.0 |

### Dirt Oval × giraffe × 30s

- **finishT:** 1.9113 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 13.84 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 21.3 | 11.6 |
| Row 1 | 7 | 14.0% | +6.9% | 20.3 | 11.9 |
| Row 2 | 1 | 2.0% | -5.1% | 19.8 | 11.5 |
| Row 3 | 2 | 4.0% | -3.1% | 20.0 | 12.0 |
| Row 4 | 4 | 8.0% | +0.9% | 19.0 | 11.4 |
| Row 5 | 5 | 10.0% | +2.9% | 20.4 | 11.7 |
| Row 6 | 2 | 4.0% | -3.1% | 23.1 | 11.2 |
| Row 7 | 5 | 10.0% | +2.9% | 20.7 | 11.9 |
| Row 8 | 4 | 8.0% | +0.9% | 19.8 | 11.4 |
| Row 9 | 3 | 6.0% | -1.1% | 20.8 | 11.6 |
| Row 10 | 6 | 12.0% | +4.9% | 19.5 | 11.7 |
| Row 11 | 5 | 10.0% | +2.9% | 20.3 | 10.6 |
| Row 12 | 3 | 6.0% | -1.1% | 21.7 | 11.1 |
| Row 13 | 0 | 0.0% | -7.1% | 19.5 | 12.2 |

### Dirt Oval × giraffe × 120s

- **finishT:** 7.6453 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 7.68 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 20.9 | 11.2 |
| Row 1 | 2 | 4.0% | -3.1% | 20.7 | 11.7 |
| Row 2 | 4 | 8.0% | +0.9% | 20.0 | 11.9 |
| Row 3 | 6 | 12.0% | +4.9% | 19.2 | 12.1 |
| Row 4 | 3 | 6.0% | -1.1% | 20.4 | 11.2 |
| Row 5 | 5 | 10.0% | +2.9% | 19.1 | 11.2 |
| Row 6 | 2 | 4.0% | -3.1% | 21.2 | 12.0 |
| Row 7 | 4 | 8.0% | +0.9% | 20.9 | 11.6 |
| Row 8 | 2 | 4.0% | -3.1% | 20.2 | 11.7 |
| Row 9 | 6 | 12.0% | +4.9% | 21.7 | 11.8 |
| Row 10 | 5 | 10.0% | +2.9% | 18.9 | 11.8 |
| Row 11 | 3 | 6.0% | -1.1% | 21.5 | 11.1 |
| Row 12 | 3 | 6.0% | -1.1% | 21.2 | 11.0 |
| Row 13 | 2 | 4.0% | -3.1% | 21.9 | 10.4 |

### Dirt Oval × snake × 30s

- **finishT:** 1.5928 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 5.04 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.0 | 12.0 |
| Row 1 | 9 | 18.0% | +5.5% | 19.8 | 11.9 |
| Row 2 | 4 | 8.0% | -4.5% | 19.4 | 11.7 |
| Row 3 | 5 | 10.0% | -2.5% | 21.5 | 11.4 |
| Row 4 | 7 | 14.0% | +1.5% | 21.5 | 11.8 |
| Row 5 | 3 | 6.0% | -6.5% | 20.7 | 11.5 |
| Row 6 | 8 | 16.0% | +3.5% | 20.3 | 11.1 |
| Row 7 | 6 | 12.0% | -0.5% | 20.8 | 11.1 |

### Dirt Oval × snake × 120s

- **finishT:** 6.3711 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 4.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -4.5% | 20.8 | 11.4 |
| Row 1 | 8 | 16.0% | +3.5% | 20.0 | 11.8 |
| Row 2 | 4 | 8.0% | -4.5% | 20.0 | 11.5 |
| Row 3 | 7 | 14.0% | +1.5% | 20.0 | 11.6 |
| Row 4 | 7 | 14.0% | +1.5% | 20.9 | 11.8 |
| Row 5 | 9 | 18.0% | +5.5% | 21.0 | 11.7 |
| Row 6 | 7 | 14.0% | +1.5% | 20.1 | 11.7 |
| Row 7 | 4 | 8.0% | -4.5% | 21.3 | 10.9 |

### Dirt Oval × dragon × 30s

- **finishT:** 2.3361 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 9.36 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 21.0 | 11.7 |
| Row 1 | 6 | 12.0% | +4.9% | 20.4 | 11.8 |
| Row 2 | 3 | 6.0% | -1.1% | 19.8 | 11.5 |
| Row 3 | 3 | 6.0% | -1.1% | 20.5 | 11.8 |
| Row 4 | 3 | 6.0% | -1.1% | 19.2 | 11.5 |
| Row 5 | 3 | 6.0% | -1.1% | 20.4 | 11.5 |
| Row 6 | 3 | 6.0% | -1.1% | 22.8 | 11.5 |
| Row 7 | 5 | 10.0% | +2.9% | 20.7 | 12.1 |
| Row 8 | 3 | 6.0% | -1.1% | 19.9 | 11.2 |
| Row 9 | 5 | 10.0% | +2.9% | 21.0 | 11.3 |
| Row 10 | 7 | 14.0% | +6.9% | 19.6 | 11.4 |
| Row 11 | 3 | 6.0% | -1.1% | 20.0 | 11.0 |
| Row 12 | 2 | 4.0% | -3.1% | 21.5 | 11.2 |
| Row 13 | 1 | 2.0% | -5.1% | 19.7 | 12.5 |

### Dirt Oval × dragon × 120s

- **finishT:** 9.3442 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 10.48 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 20.8 | 11.2 |
| Row 1 | 2 | 4.0% | -3.1% | 20.9 | 11.5 |
| Row 2 | 3 | 6.0% | -1.1% | 20.2 | 11.8 |
| Row 3 | 8 | 16.0% | +8.9% | 19.2 | 12.4 |
| Row 4 | 3 | 6.0% | -1.1% | 20.5 | 11.2 |
| Row 5 | 4 | 8.0% | +0.9% | 19.2 | 11.2 |
| Row 6 | 3 | 6.0% | -1.1% | 21.1 | 12.1 |
| Row 7 | 5 | 10.0% | +2.9% | 20.7 | 11.4 |
| Row 8 | 2 | 4.0% | -3.1% | 20.1 | 11.7 |
| Row 9 | 4 | 8.0% | +0.9% | 21.8 | 11.7 |
| Row 10 | 5 | 10.0% | +2.9% | 18.7 | 11.8 |
| Row 11 | 3 | 6.0% | -1.1% | 21.6 | 11.3 |
| Row 12 | 4 | 8.0% | +0.9% | 21.2 | 11.1 |
| Row 13 | 1 | 2.0% | -5.1% | 21.8 | 10.7 |

### Dirt Oval × f1 × 30s

- **finishT:** 2.5484 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 6.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | +2.0% | 20.8 | 11.8 |
| Row 1 | 7 | 14.0% | +4.0% | 19.8 | 12.1 |
| Row 2 | 2 | 4.0% | -6.0% | 19.5 | 11.8 |
| Row 3 | 3 | 6.0% | -4.0% | 19.3 | 11.7 |
| Row 4 | 2 | 4.0% | -6.0% | 22.1 | 11.1 |
| Row 5 | 6 | 12.0% | +2.0% | 21.5 | 11.7 |
| Row 6 | 6 | 12.0% | +2.0% | 19.6 | 11.3 |
| Row 7 | 6 | 12.0% | +2.0% | 20.9 | 11.6 |
| Row 8 | 6 | 12.0% | +2.0% | 20.0 | 10.7 |
| Row 9 | 6 | 12.0% | +2.0% | 21.5 | 11.5 |

### Dirt Oval × f1 × 120s

- **finishT:** 10.1937 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 3.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | +0.0% | 21.5 | 11.2 |
| Row 1 | 4 | 8.0% | -2.0% | 19.8 | 12.0 |
| Row 2 | 5 | 10.0% | +0.0% | 19.6 | 11.6 |
| Row 3 | 4 | 8.0% | -2.0% | 20.2 | 11.1 |
| Row 4 | 6 | 12.0% | +2.0% | 20.2 | 11.8 |
| Row 5 | 4 | 8.0% | -2.0% | 20.9 | 11.8 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 12.0 |
| Row 7 | 3 | 6.0% | -4.0% | 21.4 | 11.5 |
| Row 8 | 7 | 14.0% | +4.0% | 20.4 | 11.4 |
| Row 9 | 5 | 10.0% | +0.0% | 21.3 | 11.0 |

### Dirt Oval × rocket × 30s

- **finishT:** 2.6546 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 5.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | +2.0% | 21.0 | 11.7 |
| Row 1 | 7 | 14.0% | +4.0% | 19.9 | 12.0 |
| Row 2 | 3 | 6.0% | -4.0% | 19.3 | 11.9 |
| Row 3 | 3 | 6.0% | -4.0% | 19.5 | 11.6 |
| Row 4 | 3 | 6.0% | -4.0% | 22.0 | 11.3 |
| Row 5 | 4 | 8.0% | -2.0% | 21.6 | 11.6 |
| Row 6 | 5 | 10.0% | +0.0% | 19.7 | 11.6 |
| Row 7 | 7 | 14.0% | +4.0% | 20.8 | 11.9 |
| Row 8 | 5 | 10.0% | +0.0% | 19.9 | 10.4 |
| Row 9 | 7 | 14.0% | +4.0% | 21.4 | 11.3 |

### Dirt Oval × rocket × 120s

- **finishT:** 10.6184 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 4.80 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | +0.0% | 21.4 | 11.2 |
| Row 1 | 4 | 8.0% | -2.0% | 19.8 | 12.0 |
| Row 2 | 6 | 12.0% | +2.0% | 19.6 | 11.8 |
| Row 3 | 7 | 14.0% | +4.0% | 20.3 | 11.2 |
| Row 4 | 5 | 10.0% | +0.0% | 20.1 | 11.8 |
| Row 5 | 4 | 8.0% | -2.0% | 21.0 | 11.8 |
| Row 6 | 8 | 16.0% | +6.0% | 19.6 | 12.0 |
| Row 7 | 3 | 6.0% | -4.0% | 21.3 | 11.5 |
| Row 8 | 3 | 6.0% | -4.0% | 20.5 | 11.4 |
| Row 9 | 5 | 10.0% | +0.0% | 21.4 | 10.7 |

### Dirt Oval × buggy × 30s

- **finishT:** 2.0175 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 11.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.2 | 11.8 |
| Row 1 | 6 | 12.0% | +2.0% | 20.1 | 12.0 |
| Row 2 | 2 | 4.0% | -6.0% | 19.6 | 11.8 |
| Row 3 | 5 | 10.0% | +0.0% | 19.5 | 11.7 |
| Row 4 | 6 | 12.0% | +2.0% | 21.9 | 11.5 |
| Row 5 | 7 | 14.0% | +4.0% | 21.3 | 11.7 |
| Row 6 | 3 | 6.0% | -4.0% | 19.6 | 11.5 |
| Row 7 | 9 | 18.0% | +8.0% | 21.1 | 11.6 |
| Row 8 | 1 | 2.0% | -8.0% | 19.9 | 10.8 |
| Row 9 | 7 | 14.0% | +4.0% | 20.8 | 11.2 |

### Dirt Oval × buggy × 120s

- **finishT:** 8.0700 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 6.80 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.5 | 11.2 |
| Row 1 | 6 | 12.0% | +2.0% | 19.9 | 12.1 |
| Row 2 | 9 | 18.0% | +8.0% | 19.6 | 11.7 |
| Row 3 | 3 | 6.0% | -4.0% | 20.1 | 11.1 |
| Row 4 | 6 | 12.0% | +2.0% | 20.2 | 11.8 |
| Row 5 | 5 | 10.0% | +0.0% | 20.8 | 11.7 |
| Row 6 | 5 | 10.0% | +0.0% | 19.9 | 12.0 |
| Row 7 | 2 | 4.0% | -6.0% | 21.4 | 11.5 |
| Row 8 | 4 | 8.0% | -2.0% | 20.4 | 11.4 |
| Row 9 | 6 | 12.0% | +2.0% | 21.2 | 10.9 |

### Dirt Oval × motorbike × 30s

- **finishT:** 2.2299 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 2.48 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | -0.5% | 20.0 | 12.0 |
| Row 1 | 8 | 16.0% | +3.5% | 19.9 | 11.9 |
| Row 2 | 5 | 10.0% | -2.5% | 19.3 | 11.8 |
| Row 3 | 4 | 8.0% | -4.5% | 21.6 | 11.3 |
| Row 4 | 8 | 16.0% | +3.5% | 21.5 | 11.7 |
| Row 5 | 5 | 10.0% | -2.5% | 20.5 | 11.3 |
| Row 6 | 7 | 14.0% | +1.5% | 20.4 | 11.2 |
| Row 7 | 7 | 14.0% | +1.5% | 20.9 | 11.1 |

### Dirt Oval × motorbike × 120s

- **finishT:** 8.9195 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 1.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | -0.5% | 20.8 | 11.4 |
| Row 1 | 4 | 8.0% | -4.5% | 20.1 | 11.9 |
| Row 2 | 7 | 14.0% | +1.5% | 20.1 | 11.7 |
| Row 3 | 7 | 14.0% | +1.5% | 20.0 | 11.7 |
| Row 4 | 6 | 12.0% | -0.5% | 20.8 | 11.7 |
| Row 5 | 6 | 12.0% | -0.5% | 20.9 | 11.6 |
| Row 6 | 7 | 14.0% | +1.5% | 20.0 | 11.5 |
| Row 7 | 7 | 14.0% | +1.5% | 21.2 | 11.1 |

### Dirt Oval × plane × 30s

- **finishT:** 2.4422 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 8.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +6.0% | 21.1 | 11.8 |
| Row 1 | 9 | 18.0% | +8.0% | 19.7 | 12.0 |
| Row 2 | 4 | 8.0% | -2.0% | 19.3 | 12.0 |
| Row 3 | 5 | 10.0% | +0.0% | 19.6 | 11.5 |
| Row 4 | 5 | 10.0% | +0.0% | 21.9 | 11.4 |
| Row 5 | 3 | 6.0% | -4.0% | 21.5 | 11.6 |
| Row 6 | 5 | 10.0% | +0.0% | 19.7 | 11.5 |
| Row 7 | 5 | 10.0% | +0.0% | 20.9 | 11.6 |
| Row 8 | 2 | 4.0% | -6.0% | 20.1 | 10.7 |
| Row 9 | 4 | 8.0% | -2.0% | 21.2 | 11.2 |

### Dirt Oval × plane × 120s

- **finishT:** 9.7690 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 2.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.4 | 11.1 |
| Row 1 | 6 | 12.0% | +2.0% | 19.7 | 12.1 |
| Row 2 | 6 | 12.0% | +2.0% | 19.4 | 11.7 |
| Row 3 | 4 | 8.0% | -2.0% | 20.3 | 11.2 |
| Row 4 | 5 | 10.0% | +0.0% | 20.0 | 11.9 |
| Row 5 | 5 | 10.0% | +0.0% | 21.1 | 11.6 |
| Row 6 | 5 | 10.0% | +0.0% | 19.7 | 12.0 |
| Row 7 | 4 | 8.0% | -2.0% | 21.4 | 11.5 |
| Row 8 | 7 | 14.0% | +4.0% | 20.6 | 11.4 |
| Row 9 | 4 | 8.0% | -2.0% | 21.4 | 10.9 |

### River Run × horse × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.48 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.1 | 12.1 |
| Row 1 | 2 | 4.0% | -29.3% | 21.0 | 11.2 |
| Row 2 | 0 | 0.0% | -33.3% | 20.3 | 11.2 |

### River Run × horse × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.48 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.1 | 12.1 |
| Row 1 | 2 | 4.0% | -29.3% | 21.0 | 11.2 |
| Row 2 | 0 | 0.0% | -33.3% | 20.3 | 11.2 |

### River Run × duck × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 12.0 |
| Row 1 | 0 | 0.0% | -33.3% | 20.6 | 11.3 |
| Row 2 | 1 | 2.0% | -31.3% | 20.5 | 11.0 |

### River Run × duck × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 12.0 |
| Row 1 | 0 | 0.0% | -33.3% | 20.6 | 11.3 |
| Row 2 | 1 | 2.0% | -31.3% | 20.5 | 11.0 |

### River Run × snail × 30s

- **finishT:** 0.6371 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 63.88 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 43 | 86.0% | +52.7% | 20.5 | 11.8 |
| Row 1 | 7 | 14.0% | -19.3% | 20.5 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.2 | 11.2 |

### River Run × snail × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 62.68 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 43 | 86.0% | +52.7% | 20.3 | 11.8 |
| Row 1 | 5 | 10.0% | -23.3% | 20.8 | 11.3 |
| Row 2 | 2 | 4.0% | -29.3% | 20.2 | 11.3 |

### River Run × elephant × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 62.68 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 43 | 86.0% | +52.7% | 20.2 | 12.2 |
| Row 1 | 5 | 10.0% | -23.3% | 20.7 | 11.3 |
| Row 2 | 2 | 4.0% | -29.3% | 20.7 | 11.1 |

### River Run × elephant × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 62.68 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 43 | 86.0% | +52.7% | 20.2 | 12.2 |
| Row 1 | 5 | 10.0% | -23.3% | 20.7 | 11.3 |
| Row 2 | 2 | 4.0% | -29.3% | 20.7 | 11.1 |

### River Run × giraffe × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 4 à max. 10 Racer
- **Erwartete Win-Rate (fair):** 25.0%
- **Chi²(3):** 119.92 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 46 | 92.0% | +67.0% | 19.9 | 12.3 |
| Row 1 | 2 | 4.0% | -21.0% | 20.9 | 11.1 |
| Row 2 | 2 | 4.0% | -21.0% | 20.7 | 11.2 |
| Row 3 | 0 | 0.0% | -25.0% | 21.7 | 11.9 |

### River Run × giraffe × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 4 à max. 10 Racer
- **Erwartete Win-Rate (fair):** 25.0%
- **Chi²(3):** 119.92 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 46 | 92.0% | +67.0% | 19.9 | 12.3 |
| Row 1 | 2 | 4.0% | -21.0% | 20.9 | 11.1 |
| Row 2 | 2 | 4.0% | -21.0% | 20.7 | 11.2 |
| Row 3 | 0 | 0.0% | -25.0% | 21.7 | 11.9 |

### River Run × snake × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.6 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.4 | 11.0 |

### River Run × snake × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.6 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.4 | 11.0 |

### River Run × dragon × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 4 à max. 10 Racer
- **Erwartete Win-Rate (fair):** 25.0%
- **Chi²(3):** 113.36 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 45 | 90.0% | +65.0% | 19.6 | 12.4 |
| Row 1 | 4 | 8.0% | -17.0% | 21.0 | 10.8 |
| Row 2 | 1 | 2.0% | -23.0% | 20.4 | 11.4 |
| Row 3 | 0 | 0.0% | -25.0% | 21.8 | 11.4 |

### River Run × dragon × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 4 à max. 10 Racer
- **Erwartete Win-Rate (fair):** 25.0%
- **Chi²(3):** 113.36 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 45 | 90.0% | +65.0% | 19.6 | 12.4 |
| Row 1 | 4 | 8.0% | -17.0% | 21.0 | 10.8 |
| Row 2 | 1 | 2.0% | -23.0% | 20.4 | 11.4 |
| Row 3 | 0 | 0.0% | -25.0% | 21.8 | 11.4 |

### River Run × f1 × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.3 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.8 | 11.4 |
| Row 2 | 0 | 0.0% | -33.3% | 20.1 | 11.0 |

### River Run × f1 × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.3 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.8 | 11.4 |
| Row 2 | 0 | 0.0% | -33.3% | 20.1 | 11.0 |

### River Run × rocket × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 83.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 47 | 94.0% | +60.7% | 20.0 | 12.1 |
| Row 1 | 3 | 6.0% | -27.3% | 21.0 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.4 | 11.1 |

### River Run × rocket × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 83.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 47 | 94.0% | +60.7% | 20.0 | 12.1 |
| Row 1 | 3 | 6.0% | -27.3% | 21.0 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.4 | 11.1 |

### River Run × buggy × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 83.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 47 | 94.0% | +60.7% | 20.2 | 12.0 |
| Row 1 | 3 | 6.0% | -27.3% | 20.9 | 11.4 |
| Row 2 | 0 | 0.0% | -33.3% | 20.2 | 10.9 |

### River Run × buggy × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 83.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 47 | 94.0% | +60.7% | 20.2 | 12.0 |
| Row 1 | 3 | 6.0% | -27.3% | 20.9 | 11.4 |
| Row 2 | 0 | 0.0% | -33.3% | 20.2 | 10.9 |

### River Run × motorbike × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.6 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 10.9 |

### River Run × motorbike × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.6 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 10.9 |

### River Run × plane × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 83.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 47 | 94.0% | +60.7% | 20.0 | 12.1 |
| Row 1 | 3 | 6.0% | -27.3% | 21.0 | 11.1 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 11.3 |

### River Run × plane × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 83.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 47 | 94.0% | +60.7% | 20.0 | 12.1 |
| Row 1 | 3 | 6.0% | -27.3% | 21.0 | 11.1 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 11.3 |

### Space Sprint × horse × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.0 | 11.3 |

### Space Sprint × horse × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.0 | 11.3 |

### Space Sprint × duck × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.9 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.0 | 11.4 |

### Space Sprint × duck × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.9 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.0 | 11.4 |

### Space Sprint × snail × 30s

- **finishT:** 0.6371 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 35.28 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 46 | 92.0% | +42.0% | 20.8 | 11.8 |
| Row 1 | 4 | 8.0% | -42.0% | 20.0 | 11.2 |

### Space Sprint × snail × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 25.92 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 43 | 86.0% | +36.0% | 20.8 | 11.7 |
| Row 1 | 7 | 14.0% | -36.0% | 20.1 | 11.3 |

### Space Sprint × elephant × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.36 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.6 | 11.8 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.2 |
| Row 2 | 1 | 2.0% | -31.3% | 20.1 | 12.0 |

### Space Sprint × elephant × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.36 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.6 | 11.8 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.2 |
| Row 2 | 1 | 2.0% | -31.3% | 20.1 | 12.0 |

### Space Sprint × giraffe × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.3 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.9 | 11.0 |

### Space Sprint × giraffe × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.3 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.9 | 11.0 |

### Space Sprint × snake × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.8 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.1 | 11.3 |

### Space Sprint × snake × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.8 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.1 | 11.3 |

### Space Sprint × dragon × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.2 | 11.9 |
| Row 1 | 1 | 2.0% | -31.3% | 20.7 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.8 | 11.1 |

### Space Sprint × dragon × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.2 | 11.9 |
| Row 1 | 1 | 2.0% | -31.3% | 20.7 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.8 | 11.1 |

### Space Sprint × f1 × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.9 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.0 | 11.3 |

### Space Sprint × f1 × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.9 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.0 | 11.3 |

### Space Sprint × rocket × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.1 | 11.3 |

### Space Sprint × rocket × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.1 | 11.3 |

### Space Sprint × buggy × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.9 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.0 | 11.3 |

### Space Sprint × buggy × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.9 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.0 | 11.3 |

### Space Sprint × motorbike × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.8 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.1 | 11.3 |

### Space Sprint × motorbike × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 50.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 50 | 100.0% | +50.0% | 20.8 | 11.7 |
| Row 1 | 0 | 0.0% | -50.0% | 20.1 | 11.3 |

### Space Sprint × plane × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.8 | 11.8 |
| Row 1 | 1 | 2.0% | -48.0% | 20.2 | 11.3 |

### Space Sprint × plane × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.8 | 11.8 |
| Row 1 | 1 | 2.0% | -48.0% | 20.2 | 11.3 |

### Garden Path × horse × 30s

- **finishT:** 2.1237 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 7.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.6 | 11.6 |
| Row 1 | 6 | 12.0% | +2.0% | 20.5 | 11.9 |
| Row 2 | 3 | 6.0% | -4.0% | 19.4 | 11.9 |
| Row 3 | 2 | 4.0% | -6.0% | 19.5 | 11.6 |
| Row 4 | 5 | 10.0% | +0.0% | 21.7 | 11.3 |
| Row 5 | 5 | 10.0% | +0.0% | 21.3 | 11.7 |
| Row 6 | 9 | 18.0% | +8.0% | 19.4 | 11.5 |
| Row 7 | 7 | 14.0% | +4.0% | 21.0 | 11.6 |
| Row 8 | 4 | 8.0% | -2.0% | 19.8 | 11.0 |
| Row 9 | 5 | 10.0% | +0.0% | 20.7 | 11.2 |

### Garden Path × horse × 120s

- **finishT:** 8.4948 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 8.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.7 | 11.3 |
| Row 1 | 2 | 4.0% | -6.0% | 20.0 | 12.0 |
| Row 2 | 5 | 10.0% | +0.0% | 19.4 | 11.5 |
| Row 3 | 3 | 6.0% | -4.0% | 20.3 | 11.2 |
| Row 4 | 5 | 10.0% | +0.0% | 19.9 | 11.6 |
| Row 5 | 5 | 10.0% | +0.0% | 21.0 | 11.7 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 12.1 |
| Row 7 | 3 | 6.0% | -4.0% | 21.3 | 11.6 |
| Row 8 | 8 | 16.0% | +6.0% | 20.4 | 11.5 |
| Row 9 | 8 | 16.0% | +6.0% | 21.3 | 10.9 |

### Garden Path × duck × 30s

- **finishT:** 1.8051 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 8.24 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.8 | 11.7 |
| Row 1 | 8 | 16.0% | +3.5% | 20.5 | 11.7 |
| Row 2 | 1 | 2.0% | -10.5% | 19.6 | 11.8 |
| Row 3 | 5 | 10.0% | -2.5% | 21.3 | 11.5 |
| Row 4 | 8 | 16.0% | +3.5% | 21.3 | 11.9 |
| Row 5 | 7 | 14.0% | +1.5% | 20.2 | 11.4 |
| Row 6 | 9 | 18.0% | +5.5% | 20.0 | 11.2 |
| Row 7 | 4 | 8.0% | -4.5% | 20.3 | 11.2 |

### Garden Path × duck × 120s

- **finishT:** 7.2205 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 1.52 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -4.5% | 20.8 | 11.3 |
| Row 1 | 6 | 12.0% | -0.5% | 20.2 | 11.8 |
| Row 2 | 7 | 14.0% | +1.5% | 20.1 | 11.6 |
| Row 3 | 6 | 12.0% | -0.5% | 19.9 | 11.8 |
| Row 4 | 6 | 12.0% | -0.5% | 20.8 | 11.6 |
| Row 5 | 8 | 16.0% | +3.5% | 21.1 | 11.8 |
| Row 6 | 7 | 14.0% | +1.5% | 20.0 | 11.5 |
| Row 7 | 6 | 12.0% | -0.5% | 21.0 | 11.0 |

### Garden Path × snail × 30s

- **finishT:** 0.6371 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 2.48 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 21.8 | 12.4 |
| Row 1 | 4 | 8.0% | -4.5% | 21.1 | 11.7 |
| Row 2 | 7 | 14.0% | +1.5% | 19.9 | 11.7 |
| Row 3 | 4 | 8.0% | -4.5% | 21.3 | 11.3 |
| Row 4 | 6 | 12.0% | -0.5% | 21.1 | 11.7 |
| Row 5 | 7 | 14.0% | +1.5% | 19.8 | 11.3 |
| Row 6 | 7 | 14.0% | +1.5% | 19.2 | 11.1 |
| Row 7 | 7 | 14.0% | +1.5% | 19.6 | 11.1 |

### Garden Path × snail × 120s

- **finishT:** 2.5484 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 1.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | -2.5% | 21.1 | 11.6 |
| Row 1 | 6 | 12.0% | -0.5% | 20.3 | 11.7 |
| Row 2 | 7 | 14.0% | +1.5% | 20.0 | 11.5 |
| Row 3 | 6 | 12.0% | -0.5% | 19.8 | 11.6 |
| Row 4 | 5 | 10.0% | -2.5% | 20.7 | 11.8 |
| Row 5 | 8 | 16.0% | +3.5% | 20.9 | 11.7 |
| Row 6 | 7 | 14.0% | +1.5% | 20.2 | 11.6 |
| Row 7 | 6 | 12.0% | -0.5% | 20.9 | 11.0 |

### Garden Path × elephant × 30s

- **finishT:** 1.2742 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 9.60 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | +0.0% | 22.3 | 11.8 |
| Row 1 | 4 | 8.0% | -2.0% | 20.8 | 11.8 |
| Row 2 | 3 | 6.0% | -4.0% | 19.8 | 11.8 |
| Row 3 | 5 | 10.0% | +0.0% | 19.7 | 11.6 |
| Row 4 | 1 | 2.0% | -8.0% | 21.7 | 11.5 |
| Row 5 | 9 | 18.0% | +8.0% | 21.2 | 11.8 |
| Row 6 | 8 | 16.0% | +6.0% | 19.3 | 11.7 |
| Row 7 | 6 | 12.0% | +2.0% | 20.2 | 11.5 |
| Row 8 | 4 | 8.0% | -2.0% | 19.7 | 10.8 |
| Row 9 | 5 | 10.0% | +0.0% | 20.3 | 11.0 |

### Garden Path × elephant × 120s

- **finishT:** 5.0969 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 6.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -4.0% | 22.0 | 11.2 |
| Row 1 | 3 | 6.0% | -4.0% | 19.9 | 12.0 |
| Row 2 | 5 | 10.0% | +0.0% | 19.5 | 11.8 |
| Row 3 | 3 | 6.0% | -4.0% | 20.0 | 11.2 |
| Row 4 | 6 | 12.0% | +2.0% | 19.9 | 11.6 |
| Row 5 | 4 | 8.0% | -2.0% | 21.1 | 11.7 |
| Row 6 | 7 | 14.0% | +4.0% | 20.0 | 12.0 |
| Row 7 | 4 | 8.0% | -2.0% | 21.2 | 11.4 |
| Row 8 | 8 | 16.0% | +6.0% | 20.4 | 11.3 |
| Row 9 | 7 | 14.0% | +4.0% | 21.1 | 11.2 |

### Garden Path × giraffe × 30s

- **finishT:** 1.9113 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 24.00 — ** (p<0.01)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.7 | 11.7 |
| Row 1 | 3 | 6.0% | -4.0% | 20.3 | 11.7 |
| Row 2 | 1 | 2.0% | -8.0% | 20.0 | 11.6 |
| Row 3 | 3 | 6.0% | -4.0% | 19.6 | 11.6 |
| Row 4 | 3 | 6.0% | -4.0% | 21.8 | 11.2 |
| Row 5 | 4 | 8.0% | -2.0% | 21.2 | 11.7 |
| Row 6 | 14 | 28.0% | +18.0% | 19.6 | 11.5 |
| Row 7 | 5 | 10.0% | +0.0% | 20.5 | 11.6 |
| Row 8 | 5 | 10.0% | +0.0% | 19.6 | 11.1 |
| Row 9 | 8 | 16.0% | +6.0% | 20.7 | 11.7 |

### Garden Path × giraffe × 120s

- **finishT:** 7.6453 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -4.0% | 21.7 | 11.1 |
| Row 1 | 3 | 6.0% | -4.0% | 19.8 | 12.0 |
| Row 2 | 4 | 8.0% | -2.0% | 19.6 | 11.5 |
| Row 3 | 7 | 14.0% | +4.0% | 20.2 | 11.3 |
| Row 4 | 8 | 16.0% | +6.0% | 20.1 | 11.8 |
| Row 5 | 4 | 8.0% | -2.0% | 20.8 | 11.7 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 11.9 |
| Row 7 | 4 | 8.0% | -2.0% | 21.3 | 11.7 |
| Row 8 | 6 | 12.0% | +2.0% | 20.3 | 11.6 |
| Row 9 | 4 | 8.0% | -2.0% | 21.4 | 10.9 |

### Garden Path × snake × 30s

- **finishT:** 1.5928 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 3.44 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +1.5% | 20.8 | 11.9 |
| Row 1 | 6 | 12.0% | -0.5% | 20.3 | 11.6 |
| Row 2 | 3 | 6.0% | -6.5% | 19.7 | 11.7 |
| Row 3 | 7 | 14.0% | +1.5% | 21.4 | 11.7 |
| Row 4 | 6 | 12.0% | -0.5% | 21.5 | 11.5 |
| Row 5 | 5 | 10.0% | -2.5% | 20.0 | 11.5 |
| Row 6 | 9 | 18.0% | +5.5% | 19.9 | 11.3 |
| Row 7 | 7 | 14.0% | +1.5% | 20.4 | 11.2 |

### Garden Path × snake × 120s

- **finishT:** 6.3711 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 3.76 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | -2.5% | 20.9 | 11.3 |
| Row 1 | 7 | 14.0% | +1.5% | 20.2 | 11.9 |
| Row 2 | 6 | 12.0% | -0.5% | 20.1 | 11.6 |
| Row 3 | 7 | 14.0% | +1.5% | 19.8 | 11.7 |
| Row 4 | 4 | 8.0% | -4.5% | 20.8 | 11.6 |
| Row 5 | 10 | 20.0% | +7.5% | 21.0 | 11.7 |
| Row 6 | 6 | 12.0% | -0.5% | 20.2 | 11.6 |
| Row 7 | 5 | 10.0% | -2.5% | 21.0 | 10.9 |

### Garden Path × dragon × 30s

- **finishT:** 2.3361 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 21.68 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 1 | 2.0% | -5.1% | 21.6 | 11.6 |
| Row 1 | 0 | 0.0% | -7.1% | 20.8 | 11.7 |
| Row 2 | 3 | 6.0% | -1.1% | 20.1 | 11.4 |
| Row 3 | 4 | 8.0% | +0.9% | 20.0 | 11.9 |
| Row 4 | 3 | 6.0% | -1.1% | 19.3 | 11.5 |
| Row 5 | 5 | 10.0% | +2.9% | 20.4 | 11.8 |
| Row 6 | 1 | 2.0% | -5.1% | 23.0 | 11.4 |
| Row 7 | 4 | 8.0% | +0.9% | 20.9 | 11.8 |
| Row 8 | 9 | 18.0% | +10.9% | 19.8 | 11.7 |
| Row 9 | 4 | 8.0% | +0.9% | 20.8 | 11.6 |
| Row 10 | 7 | 14.0% | +6.9% | 19.0 | 11.6 |
| Row 11 | 2 | 4.0% | -3.1% | 20.1 | 10.3 |
| Row 12 | 5 | 10.0% | +2.9% | 21.1 | 11.3 |
| Row 13 | 2 | 4.0% | -3.1% | 19.8 | 12.7 |

### Garden Path × dragon × 120s

- **finishT:** 9.3442 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 11.60 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | +0.9% | 21.1 | 11.0 |
| Row 1 | 2 | 4.0% | -3.1% | 20.7 | 11.6 |
| Row 2 | 3 | 6.0% | -1.1% | 20.5 | 11.7 |
| Row 3 | 6 | 12.0% | +4.9% | 19.2 | 12.1 |
| Row 4 | 2 | 4.0% | -3.1% | 20.4 | 11.4 |
| Row 5 | 4 | 8.0% | +0.9% | 19.1 | 11.1 |
| Row 6 | 3 | 6.0% | -1.1% | 21.1 | 11.8 |
| Row 7 | 4 | 8.0% | +0.9% | 20.7 | 11.8 |
| Row 8 | 2 | 4.0% | -3.1% | 20.0 | 11.6 |
| Row 9 | 7 | 14.0% | +6.9% | 21.5 | 12.1 |
| Row 10 | 4 | 8.0% | +0.9% | 18.9 | 11.7 |
| Row 11 | 4 | 8.0% | +0.9% | 21.6 | 11.2 |
| Row 12 | 5 | 10.0% | +2.9% | 21.3 | 11.3 |
| Row 13 | 0 | 0.0% | -7.1% | 21.9 | 10.7 |

### Garden Path × f1 × 30s

- **finishT:** 2.5484 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 4.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +1.5% | 20.5 | 11.8 |
| Row 1 | 6 | 12.0% | -0.5% | 20.2 | 11.8 |
| Row 2 | 4 | 8.0% | -4.5% | 19.7 | 11.7 |
| Row 3 | 6 | 12.0% | -0.5% | 21.6 | 11.6 |
| Row 4 | 7 | 14.0% | +1.5% | 21.4 | 11.6 |
| Row 5 | 3 | 6.0% | -6.5% | 20.1 | 11.5 |
| Row 6 | 9 | 18.0% | +5.5% | 20.0 | 11.3 |
| Row 7 | 8 | 16.0% | +3.5% | 20.6 | 11.1 |

### Garden Path × f1 × 120s

- **finishT:** 10.1937 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 0.88 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | -2.5% | 21.0 | 11.3 |
| Row 1 | 6 | 12.0% | -0.5% | 20.1 | 11.7 |
| Row 2 | 6 | 12.0% | -0.5% | 20.1 | 11.5 |
| Row 3 | 8 | 16.0% | +3.5% | 19.9 | 11.7 |
| Row 4 | 6 | 12.0% | -0.5% | 20.8 | 11.8 |
| Row 5 | 6 | 12.0% | -0.5% | 21.1 | 11.7 |
| Row 6 | 6 | 12.0% | -0.5% | 19.9 | 11.7 |
| Row 7 | 7 | 14.0% | +1.5% | 21.2 | 11.0 |

### Garden Path × rocket × 30s

- **finishT:** 2.6546 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 11.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.6 | 11.7 |
| Row 1 | 3 | 6.0% | -4.0% | 20.4 | 11.7 |
| Row 2 | 3 | 6.0% | -4.0% | 19.5 | 11.7 |
| Row 3 | 4 | 8.0% | -2.0% | 19.3 | 11.6 |
| Row 4 | 5 | 10.0% | +0.0% | 21.6 | 11.7 |
| Row 5 | 7 | 14.0% | +4.0% | 21.5 | 11.8 |
| Row 6 | 11 | 22.0% | +12.0% | 19.5 | 11.4 |
| Row 7 | 4 | 8.0% | -2.0% | 20.8 | 11.7 |
| Row 8 | 3 | 6.0% | -4.0% | 19.9 | 10.7 |
| Row 9 | 6 | 12.0% | +2.0% | 20.8 | 11.5 |

### Garden Path × rocket × 120s

- **finishT:** 10.6184 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 4.80 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 2 | 4.0% | -6.0% | 21.5 | 11.2 |
| Row 1 | 4 | 8.0% | -2.0% | 19.9 | 11.9 |
| Row 2 | 5 | 10.0% | +0.0% | 19.8 | 11.6 |
| Row 3 | 4 | 8.0% | -2.0% | 20.3 | 11.0 |
| Row 4 | 8 | 16.0% | +6.0% | 19.9 | 11.8 |
| Row 5 | 6 | 12.0% | +2.0% | 20.9 | 11.9 |
| Row 6 | 6 | 12.0% | +2.0% | 19.8 | 11.9 |
| Row 7 | 4 | 8.0% | -2.0% | 21.4 | 11.6 |
| Row 8 | 5 | 10.0% | +0.0% | 20.4 | 11.7 |
| Row 9 | 6 | 12.0% | +2.0% | 21.2 | 11.0 |

### Garden Path × buggy × 30s

- **finishT:** 2.0175 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 6.96 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | -0.5% | 20.8 | 11.7 |
| Row 1 | 6 | 12.0% | -0.5% | 20.2 | 11.6 |
| Row 2 | 5 | 10.0% | -2.5% | 19.8 | 11.7 |
| Row 3 | 8 | 16.0% | +3.5% | 21.7 | 11.6 |
| Row 4 | 7 | 14.0% | +1.5% | 21.2 | 11.8 |
| Row 5 | 1 | 2.0% | -10.5% | 20.0 | 11.4 |
| Row 6 | 8 | 16.0% | +3.5% | 20.0 | 11.2 |
| Row 7 | 9 | 18.0% | +5.5% | 20.3 | 11.2 |

### Garden Path × buggy × 120s

- **finishT:** 8.0700 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 9.52 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -4.5% | 21.0 | 11.3 |
| Row 1 | 5 | 10.0% | -2.5% | 20.3 | 11.8 |
| Row 2 | 4 | 8.0% | -4.5% | 20.1 | 11.7 |
| Row 3 | 7 | 14.0% | +1.5% | 20.0 | 11.5 |
| Row 4 | 2 | 4.0% | -8.5% | 20.8 | 11.7 |
| Row 5 | 9 | 18.0% | +5.5% | 20.8 | 11.7 |
| Row 6 | 10 | 20.0% | +7.5% | 19.9 | 11.6 |
| Row 7 | 9 | 18.0% | +5.5% | 21.1 | 11.1 |

### Garden Path × motorbike × 30s

- **finishT:** 2.2299 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 2.16 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | -0.5% | 20.5 | 11.8 |
| Row 1 | 6 | 12.0% | -0.5% | 20.2 | 11.7 |
| Row 2 | 4 | 8.0% | -4.5% | 19.4 | 11.8 |
| Row 3 | 6 | 12.0% | -0.5% | 21.7 | 11.6 |
| Row 4 | 7 | 14.0% | +1.5% | 21.3 | 11.8 |
| Row 5 | 8 | 16.0% | +3.5% | 20.1 | 11.3 |
| Row 6 | 8 | 16.0% | +3.5% | 20.1 | 11.3 |
| Row 7 | 5 | 10.0% | -2.5% | 20.6 | 11.1 |

### Garden Path × motorbike × 120s

- **finishT:** 8.9195 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 1.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | -2.5% | 21.1 | 11.5 |
| Row 1 | 6 | 12.0% | -0.5% | 20.2 | 11.9 |
| Row 2 | 5 | 10.0% | -2.5% | 19.9 | 11.7 |
| Row 3 | 7 | 14.0% | +1.5% | 20.0 | 11.4 |
| Row 4 | 6 | 12.0% | -0.5% | 20.8 | 11.8 |
| Row 5 | 8 | 16.0% | +3.5% | 20.9 | 11.8 |
| Row 6 | 7 | 14.0% | +1.5% | 20.1 | 11.5 |
| Row 7 | 6 | 12.0% | -0.5% | 21.1 | 10.9 |

### Garden Path × plane × 30s

- **finishT:** 2.4422 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 4.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | +0.0% | 21.3 | 11.8 |
| Row 1 | 6 | 12.0% | +2.0% | 20.3 | 11.9 |
| Row 2 | 3 | 6.0% | -4.0% | 19.8 | 11.6 |
| Row 3 | 4 | 8.0% | -2.0% | 19.3 | 11.6 |
| Row 4 | 3 | 6.0% | -4.0% | 21.9 | 11.3 |
| Row 5 | 6 | 12.0% | +2.0% | 21.4 | 11.9 |
| Row 6 | 7 | 14.0% | +4.0% | 19.4 | 11.6 |
| Row 7 | 7 | 14.0% | +4.0% | 20.9 | 11.7 |
| Row 8 | 5 | 10.0% | +0.0% | 19.7 | 10.6 |
| Row 9 | 4 | 8.0% | -2.0% | 20.9 | 11.4 |

### Garden Path × plane × 120s

- **finishT:** 9.7690 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 14.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -4.0% | 21.7 | 11.2 |
| Row 1 | 2 | 4.0% | -6.0% | 19.9 | 12.0 |
| Row 2 | 3 | 6.0% | -4.0% | 19.6 | 11.8 |
| Row 3 | 3 | 6.0% | -4.0% | 20.3 | 11.2 |
| Row 4 | 10 | 20.0% | +10.0% | 19.9 | 11.9 |
| Row 5 | 4 | 8.0% | -2.0% | 21.0 | 11.6 |
| Row 6 | 8 | 16.0% | +6.0% | 19.8 | 11.9 |
| Row 7 | 3 | 6.0% | -4.0% | 21.3 | 11.6 |
| Row 8 | 8 | 16.0% | +6.0% | 20.4 | 11.4 |
| Row 9 | 6 | 12.0% | +2.0% | 21.2 | 10.9 |

### City Circuit × horse × 30s

- **finishT:** 2.1237 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 11.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +4.0% | 21.1 | 11.8 |
| Row 1 | 7 | 14.0% | +4.0% | 20.2 | 11.9 |
| Row 2 | 2 | 4.0% | -6.0% | 19.6 | 11.8 |
| Row 3 | 5 | 10.0% | +0.0% | 19.4 | 11.6 |
| Row 4 | 2 | 4.0% | -6.0% | 21.8 | 11.5 |
| Row 5 | 7 | 14.0% | +4.0% | 21.5 | 11.6 |
| Row 6 | 7 | 14.0% | +4.0% | 19.5 | 11.4 |
| Row 7 | 8 | 16.0% | +6.0% | 20.8 | 11.6 |
| Row 8 | 2 | 4.0% | -6.0% | 20.1 | 10.7 |
| Row 9 | 3 | 6.0% | -4.0% | 21.1 | 11.5 |

### City Circuit × horse × 120s

- **finishT:** 8.4948 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 4.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | +0.0% | 21.3 | 11.3 |
| Row 1 | 6 | 12.0% | +2.0% | 19.8 | 12.2 |
| Row 2 | 6 | 12.0% | +2.0% | 19.6 | 11.7 |
| Row 3 | 3 | 6.0% | -4.0% | 20.2 | 11.0 |
| Row 4 | 6 | 12.0% | +2.0% | 20.0 | 11.6 |
| Row 5 | 6 | 12.0% | +2.0% | 21.0 | 11.7 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 12.0 |
| Row 7 | 3 | 6.0% | -4.0% | 21.7 | 11.6 |
| Row 8 | 3 | 6.0% | -4.0% | 20.4 | 11.5 |
| Row 9 | 5 | 10.0% | +0.0% | 21.3 | 10.8 |

### City Circuit × duck × 30s

- **finishT:** 1.8051 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 6.96 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +1.5% | 20.3 | 11.9 |
| Row 1 | 11 | 22.0% | +9.5% | 20.1 | 12.1 |
| Row 2 | 6 | 12.0% | -0.5% | 19.5 | 11.8 |
| Row 3 | 7 | 14.0% | +1.5% | 21.5 | 11.4 |
| Row 4 | 5 | 10.0% | -2.5% | 21.6 | 11.8 |
| Row 5 | 2 | 4.0% | -8.5% | 20.2 | 11.2 |
| Row 6 | 6 | 12.0% | -0.5% | 20.1 | 11.0 |
| Row 7 | 6 | 12.0% | -0.5% | 20.8 | 11.1 |

### City Circuit × duck × 120s

- **finishT:** 7.2205 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 2.48 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 5 | 10.0% | -2.5% | 20.8 | 11.5 |
| Row 1 | 8 | 16.0% | +3.5% | 20.1 | 11.8 |
| Row 2 | 6 | 12.0% | -0.5% | 20.2 | 11.6 |
| Row 3 | 8 | 16.0% | +3.5% | 20.0 | 11.6 |
| Row 4 | 4 | 8.0% | -4.5% | 20.9 | 11.8 |
| Row 5 | 7 | 14.0% | +1.5% | 20.9 | 11.6 |
| Row 6 | 7 | 14.0% | +1.5% | 20.0 | 11.7 |
| Row 7 | 5 | 10.0% | -2.5% | 21.2 | 11.0 |

### City Circuit × snail × 30s

- **finishT:** 0.6371 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 6.96 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 11 | 22.0% | +9.5% | 20.9 | 12.5 |
| Row 1 | 7 | 14.0% | +1.5% | 20.8 | 11.7 |
| Row 2 | 6 | 12.0% | -0.5% | 19.7 | 11.7 |
| Row 3 | 5 | 10.0% | -2.5% | 21.6 | 11.4 |
| Row 4 | 4 | 8.0% | -4.5% | 21.3 | 11.7 |
| Row 5 | 6 | 12.0% | -0.5% | 20.0 | 11.2 |
| Row 6 | 8 | 16.0% | +3.5% | 19.6 | 11.1 |
| Row 7 | 3 | 6.0% | -6.5% | 20.0 | 10.9 |

### City Circuit × snail × 120s

- **finishT:** 2.5484 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 3.76 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 7 | 14.0% | +1.5% | 20.7 | 11.6 |
| Row 1 | 8 | 16.0% | +3.5% | 20.1 | 11.9 |
| Row 2 | 5 | 10.0% | -2.5% | 20.0 | 11.6 |
| Row 3 | 5 | 10.0% | -2.5% | 20.0 | 11.4 |
| Row 4 | 3 | 6.0% | -6.5% | 20.7 | 11.7 |
| Row 5 | 8 | 16.0% | +3.5% | 21.2 | 11.7 |
| Row 6 | 8 | 16.0% | +3.5% | 20.2 | 11.6 |
| Row 7 | 6 | 12.0% | -0.5% | 21.1 | 10.9 |

### City Circuit × elephant × 30s

- **finishT:** 1.2742 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 8.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | +2.0% | 21.6 | 11.8 |
| Row 1 | 9 | 18.0% | +8.0% | 20.4 | 12.3 |
| Row 2 | 2 | 4.0% | -6.0% | 19.6 | 11.7 |
| Row 3 | 5 | 10.0% | +0.0% | 19.5 | 11.8 |
| Row 4 | 3 | 6.0% | -4.0% | 21.8 | 11.5 |
| Row 5 | 5 | 10.0% | +0.0% | 21.2 | 11.8 |
| Row 6 | 7 | 14.0% | +4.0% | 19.7 | 11.4 |
| Row 7 | 6 | 12.0% | +2.0% | 20.5 | 11.6 |
| Row 8 | 3 | 6.0% | -4.0% | 19.9 | 10.6 |
| Row 9 | 4 | 8.0% | -2.0% | 20.8 | 11.1 |

### City Circuit × elephant × 120s

- **finishT:** 5.0969 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 12.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.3 | 11.2 |
| Row 1 | 3 | 6.0% | -4.0% | 19.7 | 12.1 |
| Row 2 | 9 | 18.0% | +8.0% | 19.6 | 11.5 |
| Row 3 | 3 | 6.0% | -4.0% | 20.5 | 11.2 |
| Row 4 | 4 | 8.0% | -2.0% | 20.0 | 11.9 |
| Row 5 | 7 | 14.0% | +4.0% | 20.9 | 11.7 |
| Row 6 | 9 | 18.0% | +8.0% | 19.8 | 11.9 |
| Row 7 | 2 | 4.0% | -6.0% | 21.4 | 11.5 |
| Row 8 | 3 | 6.0% | -4.0% | 20.6 | 11.4 |
| Row 9 | 6 | 12.0% | +2.0% | 21.3 | 11.0 |

### City Circuit × giraffe × 30s

- **finishT:** 1.9113 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 14.40 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 2 | 4.0% | -3.1% | 21.5 | 11.5 |
| Row 1 | 5 | 10.0% | +2.9% | 20.4 | 11.8 |
| Row 2 | 4 | 8.0% | +0.9% | 19.8 | 11.8 |
| Row 3 | 0 | 0.0% | -7.1% | 20.2 | 12.0 |
| Row 4 | 5 | 10.0% | +2.9% | 19.2 | 11.5 |
| Row 5 | 4 | 8.0% | +0.9% | 20.8 | 11.8 |
| Row 6 | 2 | 4.0% | -3.1% | 23.2 | 11.4 |
| Row 7 | 7 | 14.0% | +6.9% | 20.7 | 11.8 |
| Row 8 | 5 | 10.0% | +2.9% | 19.3 | 11.5 |
| Row 9 | 4 | 8.0% | +0.9% | 20.9 | 11.4 |
| Row 10 | 6 | 12.0% | +4.9% | 19.4 | 11.6 |
| Row 11 | 3 | 6.0% | -1.1% | 20.2 | 10.6 |
| Row 12 | 2 | 4.0% | -3.1% | 21.4 | 11.0 |
| Row 13 | 1 | 2.0% | -5.1% | 19.1 | 12.4 |

### City Circuit × giraffe × 120s

- **finishT:** 7.6453 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 10.48 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 20.9 | 11.1 |
| Row 1 | 2 | 4.0% | -3.1% | 20.8 | 11.6 |
| Row 2 | 3 | 6.0% | -1.1% | 20.1 | 11.8 |
| Row 3 | 5 | 10.0% | +2.9% | 19.3 | 12.1 |
| Row 4 | 3 | 6.0% | -1.1% | 20.5 | 11.3 |
| Row 5 | 5 | 10.0% | +2.9% | 19.2 | 11.2 |
| Row 6 | 4 | 8.0% | +0.9% | 21.2 | 12.1 |
| Row 7 | 5 | 10.0% | +2.9% | 20.8 | 11.6 |
| Row 8 | 2 | 4.0% | -3.1% | 20.1 | 11.6 |
| Row 9 | 6 | 12.0% | +4.9% | 21.6 | 12.1 |
| Row 10 | 6 | 12.0% | +4.9% | 19.0 | 11.9 |
| Row 11 | 1 | 2.0% | -5.1% | 21.5 | 11.2 |
| Row 12 | 4 | 8.0% | +0.9% | 21.2 | 10.9 |
| Row 13 | 1 | 2.0% | -5.1% | 21.7 | 10.2 |

### City Circuit × snake × 30s

- **finishT:** 1.5928 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 5.04 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.1 | 11.9 |
| Row 1 | 9 | 18.0% | +5.5% | 20.2 | 12.0 |
| Row 2 | 4 | 8.0% | -4.5% | 19.6 | 11.8 |
| Row 3 | 4 | 8.0% | -4.5% | 21.5 | 11.4 |
| Row 4 | 9 | 18.0% | +5.5% | 21.5 | 11.8 |
| Row 5 | 5 | 10.0% | -2.5% | 20.2 | 11.3 |
| Row 6 | 6 | 12.0% | -0.5% | 20.2 | 11.1 |
| Row 7 | 5 | 10.0% | -2.5% | 20.7 | 11.1 |

### City Circuit × snake × 120s

- **finishT:** 6.3711 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 6.96 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 6 | 12.0% | -0.5% | 20.8 | 11.4 |
| Row 1 | 9 | 18.0% | +5.5% | 20.2 | 11.8 |
| Row 2 | 3 | 6.0% | -6.5% | 20.0 | 11.6 |
| Row 3 | 6 | 12.0% | -0.5% | 20.0 | 11.7 |
| Row 4 | 3 | 6.0% | -6.5% | 20.8 | 11.7 |
| Row 5 | 6 | 12.0% | -0.5% | 21.0 | 11.6 |
| Row 6 | 10 | 20.0% | +7.5% | 20.1 | 11.7 |
| Row 7 | 7 | 14.0% | +1.5% | 21.1 | 11.0 |

### City Circuit × dragon × 30s

- **finishT:** 2.3361 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 9.36 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 21.2 | 11.7 |
| Row 1 | 5 | 10.0% | +2.9% | 20.5 | 11.7 |
| Row 2 | 2 | 4.0% | -3.1% | 19.7 | 11.6 |
| Row 3 | 3 | 6.0% | -1.1% | 20.2 | 11.8 |
| Row 4 | 3 | 6.0% | -1.1% | 19.1 | 11.5 |
| Row 5 | 6 | 12.0% | +4.9% | 20.5 | 11.5 |
| Row 6 | 3 | 6.0% | -1.1% | 23.0 | 11.4 |
| Row 7 | 4 | 8.0% | +0.9% | 20.8 | 11.8 |
| Row 8 | 5 | 10.0% | +2.9% | 19.4 | 11.4 |
| Row 9 | 2 | 4.0% | -3.1% | 21.0 | 11.6 |
| Row 10 | 5 | 10.0% | +2.9% | 19.6 | 11.6 |
| Row 11 | 5 | 10.0% | +2.9% | 20.2 | 10.9 |
| Row 12 | 4 | 8.0% | +0.9% | 21.5 | 11.2 |
| Row 13 | 0 | 0.0% | -7.1% | 19.9 | 12.3 |

### City Circuit × dragon × 120s

- **finishT:** 9.3442 (Ziellinie in t-Raum)
- **Reihen:** 14 à max. 3 Racer
- **Erwartete Win-Rate (fair):** 7.1%
- **Chi²(13):** 6.56 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -1.1% | 20.8 | 11.1 |
| Row 1 | 2 | 4.0% | -3.1% | 20.8 | 11.4 |
| Row 2 | 5 | 10.0% | +2.9% | 20.1 | 12.0 |
| Row 3 | 7 | 14.0% | +6.9% | 19.1 | 12.2 |
| Row 4 | 3 | 6.0% | -1.1% | 20.6 | 11.1 |
| Row 5 | 4 | 8.0% | +0.9% | 19.2 | 11.2 |
| Row 6 | 3 | 6.0% | -1.1% | 21.1 | 12.1 |
| Row 7 | 5 | 10.0% | +2.9% | 20.9 | 11.8 |
| Row 8 | 3 | 6.0% | -1.1% | 20.2 | 11.7 |
| Row 9 | 4 | 8.0% | +0.9% | 21.6 | 11.8 |
| Row 10 | 3 | 6.0% | -1.1% | 18.9 | 11.7 |
| Row 11 | 3 | 6.0% | -1.1% | 21.5 | 11.1 |
| Row 12 | 3 | 6.0% | -1.1% | 21.2 | 11.3 |
| Row 13 | 2 | 4.0% | -3.1% | 21.9 | 10.7 |

### City Circuit × f1 × 30s

- **finishT:** 2.5484 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 1.52 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.4 | 11.7 |
| Row 1 | 6 | 12.0% | -0.5% | 19.9 | 11.9 |
| Row 2 | 4 | 8.0% | -4.5% | 19.3 | 11.9 |
| Row 3 | 6 | 12.0% | -0.5% | 21.3 | 11.4 |
| Row 4 | 7 | 14.0% | +1.5% | 21.5 | 11.7 |
| Row 5 | 6 | 12.0% | -0.5% | 20.5 | 11.4 |
| Row 6 | 7 | 14.0% | +1.5% | 20.3 | 11.1 |
| Row 7 | 6 | 12.0% | -0.5% | 20.8 | 11.2 |

### City Circuit × f1 × 120s

- **finishT:** 10.1937 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 2.16 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -4.5% | 20.8 | 11.3 |
| Row 1 | 6 | 12.0% | -0.5% | 20.1 | 11.9 |
| Row 2 | 5 | 10.0% | -2.5% | 20.1 | 11.6 |
| Row 3 | 8 | 16.0% | +3.5% | 19.9 | 11.6 |
| Row 4 | 6 | 12.0% | -0.5% | 20.8 | 11.6 |
| Row 5 | 7 | 14.0% | +1.5% | 21.1 | 11.7 |
| Row 6 | 8 | 16.0% | +3.5% | 20.1 | 11.7 |
| Row 7 | 6 | 12.0% | -0.5% | 21.1 | 11.0 |

### City Circuit × rocket × 30s

- **finishT:** 2.6546 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 3.60 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +6.0% | 20.9 | 11.7 |
| Row 1 | 6 | 12.0% | +2.0% | 19.7 | 11.9 |
| Row 2 | 5 | 10.0% | +0.0% | 19.6 | 11.8 |
| Row 3 | 4 | 8.0% | -2.0% | 19.5 | 11.4 |
| Row 4 | 5 | 10.0% | +0.0% | 21.8 | 11.4 |
| Row 5 | 6 | 12.0% | +2.0% | 21.5 | 11.8 |
| Row 6 | 4 | 8.0% | -2.0% | 19.6 | 11.4 |
| Row 7 | 5 | 10.0% | +0.0% | 20.9 | 12.0 |
| Row 8 | 3 | 6.0% | -4.0% | 20.2 | 10.7 |
| Row 9 | 4 | 8.0% | -2.0% | 21.2 | 11.4 |

### City Circuit × rocket × 120s

- **finishT:** 10.6184 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 5.20 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.5 | 11.3 |
| Row 1 | 8 | 16.0% | +6.0% | 19.7 | 12.1 |
| Row 2 | 7 | 14.0% | +4.0% | 19.4 | 11.6 |
| Row 3 | 4 | 8.0% | -2.0% | 20.3 | 11.1 |
| Row 4 | 5 | 10.0% | +0.0% | 20.2 | 11.7 |
| Row 5 | 4 | 8.0% | -2.0% | 20.9 | 11.7 |
| Row 6 | 6 | 12.0% | +2.0% | 19.7 | 12.0 |
| Row 7 | 2 | 4.0% | -6.0% | 21.5 | 11.4 |
| Row 8 | 5 | 10.0% | +0.0% | 20.6 | 11.5 |
| Row 9 | 5 | 10.0% | +0.0% | 21.3 | 11.0 |

### City Circuit × buggy × 30s

- **finishT:** 2.0175 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 2.48 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.1 | 12.0 |
| Row 1 | 5 | 10.0% | -2.5% | 19.8 | 11.8 |
| Row 2 | 5 | 10.0% | -2.5% | 19.6 | 11.7 |
| Row 3 | 6 | 12.0% | -0.5% | 21.7 | 11.5 |
| Row 4 | 9 | 18.0% | +5.5% | 21.3 | 11.8 |
| Row 5 | 6 | 12.0% | -0.5% | 20.3 | 11.3 |
| Row 6 | 5 | 10.0% | -2.5% | 20.4 | 11.2 |
| Row 7 | 6 | 12.0% | -0.5% | 20.8 | 11.1 |

### City Circuit × buggy × 120s

- **finishT:** 8.0700 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 5.04 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 8 | 16.0% | +3.5% | 20.8 | 11.4 |
| Row 1 | 8 | 16.0% | +3.5% | 20.0 | 11.8 |
| Row 2 | 3 | 6.0% | -6.5% | 20.0 | 11.6 |
| Row 3 | 4 | 8.0% | -4.5% | 20.1 | 11.5 |
| Row 4 | 5 | 10.0% | -2.5% | 20.9 | 11.7 |
| Row 5 | 7 | 14.0% | +1.5% | 21.0 | 11.7 |
| Row 6 | 9 | 18.0% | +5.5% | 20.0 | 11.7 |
| Row 7 | 6 | 12.0% | -0.5% | 21.2 | 11.0 |

### City Circuit × motorbike × 30s

- **finishT:** 2.2299 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 5.36 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 9 | 18.0% | +5.5% | 20.0 | 11.8 |
| Row 1 | 7 | 14.0% | +1.5% | 20.0 | 12.0 |
| Row 2 | 2 | 4.0% | -8.5% | 19.3 | 11.5 |
| Row 3 | 7 | 14.0% | +1.5% | 21.5 | 11.7 |
| Row 4 | 7 | 14.0% | +1.5% | 21.6 | 11.8 |
| Row 5 | 7 | 14.0% | +1.5% | 20.2 | 11.3 |
| Row 6 | 7 | 14.0% | +1.5% | 20.5 | 11.1 |
| Row 7 | 4 | 8.0% | -4.5% | 20.9 | 11.1 |

### City Circuit × motorbike × 120s

- **finishT:** 8.9195 (Ziellinie in t-Raum)
- **Reihen:** 8 à max. 5 Racer
- **Erwartete Win-Rate (fair):** 12.5%
- **Chi²(7):** 5.68 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -4.5% | 20.8 | 11.4 |
| Row 1 | 7 | 14.0% | +1.5% | 20.1 | 11.8 |
| Row 2 | 4 | 8.0% | -4.5% | 20.1 | 11.6 |
| Row 3 | 8 | 16.0% | +3.5% | 19.9 | 11.6 |
| Row 4 | 4 | 8.0% | -4.5% | 20.9 | 11.8 |
| Row 5 | 9 | 18.0% | +5.5% | 20.9 | 11.8 |
| Row 6 | 9 | 18.0% | +5.5% | 20.1 | 11.6 |
| Row 7 | 5 | 10.0% | -2.5% | 21.1 | 10.9 |

### City Circuit × plane × 30s

- **finishT:** 2.4422 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 6.00 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 4 | 8.0% | -2.0% | 21.2 | 11.7 |
| Row 1 | 8 | 16.0% | +6.0% | 19.8 | 12.0 |
| Row 2 | 2 | 4.0% | -6.0% | 19.6 | 11.6 |
| Row 3 | 6 | 12.0% | +2.0% | 19.6 | 11.5 |
| Row 4 | 5 | 10.0% | +0.0% | 21.6 | 11.5 |
| Row 5 | 5 | 10.0% | +0.0% | 21.1 | 11.8 |
| Row 6 | 7 | 14.0% | +4.0% | 19.9 | 11.6 |
| Row 7 | 4 | 8.0% | -2.0% | 20.8 | 11.6 |
| Row 8 | 3 | 6.0% | -4.0% | 20.2 | 10.7 |
| Row 9 | 6 | 12.0% | +2.0% | 21.2 | 11.4 |

### City Circuit × plane × 120s

- **finishT:** 9.7690 (Ziellinie in t-Raum)
- **Reihen:** 10 à max. 4 Racer
- **Erwartete Win-Rate (fair):** 10.0%
- **Chi²(9):** 4.80 — n.s.

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 3 | 6.0% | -4.0% | 21.5 | 11.2 |
| Row 1 | 3 | 6.0% | -4.0% | 19.7 | 12.0 |
| Row 2 | 6 | 12.0% | +2.0% | 19.5 | 11.7 |
| Row 3 | 4 | 8.0% | -2.0% | 20.2 | 11.2 |
| Row 4 | 8 | 16.0% | +6.0% | 20.1 | 11.8 |
| Row 5 | 5 | 10.0% | +0.0% | 21.0 | 11.8 |
| Row 6 | 7 | 14.0% | +4.0% | 19.8 | 12.1 |
| Row 7 | 4 | 8.0% | -2.0% | 21.3 | 11.6 |
| Row 8 | 5 | 10.0% | +0.0% | 20.5 | 11.3 |
| Row 9 | 5 | 10.0% | +0.0% | 21.4 | 10.8 |

### Weltall × horse × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.7 | 11.8 |
| Row 1 | 1 | 2.0% | -31.3% | 20.3 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 11.2 |

### Weltall × horse × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.7 | 11.8 |
| Row 1 | 1 | 2.0% | -31.3% | 20.3 | 11.3 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 11.2 |

### Weltall × duck × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.8 |
| Row 1 | 1 | 2.0% | -48.0% | 20.0 | 11.3 |

### Weltall × duck × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.8 |
| Row 1 | 1 | 2.0% | -48.0% | 20.0 | 11.3 |

### Weltall × snail × 30s

- **finishT:** 0.6371 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 28.88 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 44 | 88.0% | +38.0% | 20.8 | 11.8 |
| Row 1 | 6 | 12.0% | -38.0% | 20.2 | 11.2 |

### Weltall × snail × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 32.00 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 45 | 90.0% | +40.0% | 20.7 | 11.7 |
| Row 1 | 5 | 10.0% | -40.0% | 20.3 | 11.4 |

### Weltall × elephant × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.36 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.4 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.3 |
| Row 2 | 1 | 2.0% | -31.3% | 20.7 | 11.1 |

### Weltall × elephant × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.36 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.4 | 12.0 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.3 |
| Row 2 | 1 | 2.0% | -31.3% | 20.7 | 11.1 |

### Weltall × giraffe × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.48 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.2 | 12.0 |
| Row 1 | 2 | 4.0% | -29.3% | 21.0 | 11.2 |
| Row 2 | 0 | 0.0% | -33.3% | 20.2 | 11.3 |

### Weltall × giraffe × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.48 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.2 | 12.0 |
| Row 1 | 2 | 4.0% | -29.3% | 21.0 | 11.2 |
| Row 2 | 0 | 0.0% | -33.3% | 20.2 | 11.3 |

### Weltall × snake × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.9 |
| Row 1 | 1 | 2.0% | -48.0% | 20.1 | 11.2 |

### Weltall × snake × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.9 |
| Row 1 | 1 | 2.0% | -48.0% | 20.1 | 11.2 |

### Weltall × dragon × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.48 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.0 | 12.1 |
| Row 1 | 2 | 4.0% | -29.3% | 20.9 | 11.2 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 11.2 |

### Weltall × dragon × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 88.48 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 48 | 96.0% | +62.7% | 20.0 | 12.1 |
| Row 1 | 2 | 4.0% | -29.3% | 20.9 | 11.2 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 11.2 |

### Weltall × f1 × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.8 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.2 | 11.3 |

### Weltall × f1 × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.8 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.2 | 11.3 |

### Weltall × rocket × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.6 | 11.8 |
| Row 1 | 1 | 2.0% | -31.3% | 20.4 | 11.4 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 10.9 |

### Weltall × rocket × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.6 | 11.8 |
| Row 1 | 1 | 2.0% | -31.3% | 20.4 | 11.4 |
| Row 2 | 0 | 0.0% | -33.3% | 20.5 | 10.9 |

### Weltall × buggy × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.8 | 11.8 |
| Row 1 | 1 | 2.0% | -48.0% | 20.2 | 11.3 |

### Weltall × buggy × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.8 | 11.8 |
| Row 1 | 1 | 2.0% | -48.0% | 20.2 | 11.3 |

### Weltall × motorbike × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.1 | 11.3 |

### Weltall × motorbike × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 2 à max. 20 Racer
- **Erwartete Win-Rate (fair):** 50.0%
- **Chi²(1):** 46.08 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +48.0% | 20.9 | 11.7 |
| Row 1 | 1 | 2.0% | -48.0% | 20.1 | 11.3 |

### Weltall × plane × 30s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 11.7 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.5 |
| Row 2 | 0 | 0.0% | -33.3% | 21.0 | 11.1 |

### Weltall × plane × 120s

- **finishT:** 0.9500 (Ziellinie in t-Raum)
- **Reihen:** 3 à max. 14 Racer
- **Erwartete Win-Rate (fair):** 33.3%
- **Chi²(2):** 94.12 — *** (p<0.001)

| Reihe | Siege | Win-Rate | Δ Erwartet | Ø Rang | σ Rang |
|-------|-------|----------|------------|--------|--------|
| Row 0 | 49 | 98.0% | +64.7% | 20.4 | 11.7 |
| Row 1 | 1 | 2.0% | -31.3% | 20.5 | 11.5 |
| Row 2 | 0 | 0.0% | -33.3% | 21.0 | 11.1 |

---

## Gesamtauswertung

**Getestete Kombinationen:** 144  
**Davon statistisch fair (p≥0.05):** 71  
**Davon statistisch unfair (p<0.05):** 73  

**Kombinationen mit signifikantem Ungleichgewicht (p < 0.05):**

- **River Run × horse × 30s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **River Run × horse × 120s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **River Run × duck × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × duck × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × snail × 30s:** Row 0 zu oft (86.0% statt 33.3%) — *** (p<0.001)
- **River Run × snail × 120s:** Row 0 zu oft (86.0% statt 33.3%) — *** (p<0.001)
- **River Run × elephant × 30s:** Row 0 zu oft (86.0% statt 33.3%) — *** (p<0.001)
- **River Run × elephant × 120s:** Row 0 zu oft (86.0% statt 33.3%) — *** (p<0.001)
- **River Run × giraffe × 30s:** Row 0 zu oft (92.0% statt 25.0%) — *** (p<0.001)
- **River Run × giraffe × 120s:** Row 0 zu oft (92.0% statt 25.0%) — *** (p<0.001)
- **River Run × snake × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × snake × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × dragon × 30s:** Row 0 zu oft (90.0% statt 25.0%) — *** (p<0.001)
- **River Run × dragon × 120s:** Row 0 zu oft (90.0% statt 25.0%) — *** (p<0.001)
- **River Run × f1 × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × f1 × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × rocket × 30s:** Row 0 zu oft (94.0% statt 33.3%) — *** (p<0.001)
- **River Run × rocket × 120s:** Row 0 zu oft (94.0% statt 33.3%) — *** (p<0.001)
- **River Run × buggy × 30s:** Row 0 zu oft (94.0% statt 33.3%) — *** (p<0.001)
- **River Run × buggy × 120s:** Row 0 zu oft (94.0% statt 33.3%) — *** (p<0.001)
- **River Run × motorbike × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × motorbike × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **River Run × plane × 30s:** Row 0 zu oft (94.0% statt 33.3%) — *** (p<0.001)
- **River Run × plane × 120s:** Row 0 zu oft (94.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × horse × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × horse × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × duck × 30s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × duck × 120s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × snail × 30s:** Row 0 zu oft (92.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × snail × 120s:** Row 0 zu oft (86.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × elephant × 30s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × elephant × 120s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × giraffe × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × giraffe × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × snake × 30s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × snake × 120s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × dragon × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × dragon × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Space Sprint × f1 × 30s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × f1 × 120s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × rocket × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × rocket × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × buggy × 30s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × buggy × 120s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × motorbike × 30s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × motorbike × 120s:** Row 0 zu oft (100.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × plane × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Space Sprint × plane × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Garden Path × giraffe × 30s:** Row 0 zu selten (8.0% statt 10.0%) — ** (p<0.01)
- **Weltall × horse × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Weltall × horse × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Weltall × duck × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × duck × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × snail × 30s:** Row 0 zu oft (88.0% statt 50.0%) — *** (p<0.001)
- **Weltall × snail × 120s:** Row 0 zu oft (90.0% statt 50.0%) — *** (p<0.001)
- **Weltall × elephant × 30s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Weltall × elephant × 120s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Weltall × giraffe × 30s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Weltall × giraffe × 120s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Weltall × snake × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × snake × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × dragon × 30s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Weltall × dragon × 120s:** Row 0 zu oft (96.0% statt 33.3%) — *** (p<0.001)
- **Weltall × f1 × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × f1 × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × rocket × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Weltall × rocket × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Weltall × buggy × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × buggy × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × motorbike × 30s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × motorbike × 120s:** Row 0 zu oft (98.0% statt 50.0%) — *** (p<0.001)
- **Weltall × plane × 30s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)
- **Weltall × plane × 120s:** Row 0 zu oft (98.0% statt 33.3%) — *** (p<0.001)

---

## Empfehlung

### Front-Row-Vorteil (Row 0 gewinnt zu oft)
- **River Run × horse × 30s** — *** (p<0.001)
- **River Run × horse × 120s** — *** (p<0.001)
- **River Run × duck × 30s** — *** (p<0.001)
- **River Run × duck × 120s** — *** (p<0.001)
- **River Run × snail × 30s** — *** (p<0.001)
- **River Run × snail × 120s** — *** (p<0.001)
- **River Run × elephant × 30s** — *** (p<0.001)
- **River Run × elephant × 120s** — *** (p<0.001)
- **River Run × giraffe × 30s** — *** (p<0.001)
- **River Run × giraffe × 120s** — *** (p<0.001)
- **River Run × snake × 30s** — *** (p<0.001)
- **River Run × snake × 120s** — *** (p<0.001)
- **River Run × dragon × 30s** — *** (p<0.001)
- **River Run × dragon × 120s** — *** (p<0.001)
- **River Run × f1 × 30s** — *** (p<0.001)
- **River Run × f1 × 120s** — *** (p<0.001)
- **River Run × rocket × 30s** — *** (p<0.001)
- **River Run × rocket × 120s** — *** (p<0.001)
- **River Run × buggy × 30s** — *** (p<0.001)
- **River Run × buggy × 120s** — *** (p<0.001)
- **River Run × motorbike × 30s** — *** (p<0.001)
- **River Run × motorbike × 120s** — *** (p<0.001)
- **River Run × plane × 30s** — *** (p<0.001)
- **River Run × plane × 120s** — *** (p<0.001)
- **Space Sprint × horse × 30s** — *** (p<0.001)
- **Space Sprint × horse × 120s** — *** (p<0.001)
- **Space Sprint × duck × 30s** — *** (p<0.001)
- **Space Sprint × duck × 120s** — *** (p<0.001)
- **Space Sprint × snail × 30s** — *** (p<0.001)
- **Space Sprint × snail × 120s** — *** (p<0.001)
- **Space Sprint × elephant × 30s** — *** (p<0.001)
- **Space Sprint × elephant × 120s** — *** (p<0.001)
- **Space Sprint × giraffe × 30s** — *** (p<0.001)
- **Space Sprint × giraffe × 120s** — *** (p<0.001)
- **Space Sprint × snake × 30s** — *** (p<0.001)
- **Space Sprint × snake × 120s** — *** (p<0.001)
- **Space Sprint × dragon × 30s** — *** (p<0.001)
- **Space Sprint × dragon × 120s** — *** (p<0.001)
- **Space Sprint × f1 × 30s** — *** (p<0.001)
- **Space Sprint × f1 × 120s** — *** (p<0.001)
- **Space Sprint × rocket × 30s** — *** (p<0.001)
- **Space Sprint × rocket × 120s** — *** (p<0.001)
- **Space Sprint × buggy × 30s** — *** (p<0.001)
- **Space Sprint × buggy × 120s** — *** (p<0.001)
- **Space Sprint × motorbike × 30s** — *** (p<0.001)
- **Space Sprint × motorbike × 120s** — *** (p<0.001)
- **Space Sprint × plane × 30s** — *** (p<0.001)
- **Space Sprint × plane × 120s** — *** (p<0.001)
- **Weltall × horse × 30s** — *** (p<0.001)
- **Weltall × horse × 120s** — *** (p<0.001)
- **Weltall × duck × 30s** — *** (p<0.001)
- **Weltall × duck × 120s** — *** (p<0.001)
- **Weltall × snail × 30s** — *** (p<0.001)
- **Weltall × snail × 120s** — *** (p<0.001)
- **Weltall × elephant × 30s** — *** (p<0.001)
- **Weltall × elephant × 120s** — *** (p<0.001)
- **Weltall × giraffe × 30s** — *** (p<0.001)
- **Weltall × giraffe × 120s** — *** (p<0.001)
- **Weltall × snake × 30s** — *** (p<0.001)
- **Weltall × snake × 120s** — *** (p<0.001)
- **Weltall × dragon × 30s** — *** (p<0.001)
- **Weltall × dragon × 120s** — *** (p<0.001)
- **Weltall × f1 × 30s** — *** (p<0.001)
- **Weltall × f1 × 120s** — *** (p<0.001)
- **Weltall × rocket × 30s** — *** (p<0.001)
- **Weltall × rocket × 120s** — *** (p<0.001)
- **Weltall × buggy × 30s** — *** (p<0.001)
- **Weltall × buggy × 120s** — *** (p<0.001)
- **Weltall × motorbike × 30s** — *** (p<0.001)
- **Weltall × motorbike × 120s** — *** (p<0.001)
- **Weltall × plane × 30s** — *** (p<0.001)
- **Weltall × plane × 120s** — *** (p<0.001)

### Hinter-Row-Nachteil (Row 0 gewinnt zu selten / Catch-Up überkompensiert)
Keine Kombination zeigt Hinter-Row-Nachteil oder Überkompensation.

### Catch-Up-Mechanismus (speedBonusFactor = 1.0)
Unfairness tritt häufiger bei **kurzen Rennen (30s)** auf (37/73 unfaire Kombos). Der Catch-Up-Mechanismus benötigt Renndauer zum Wirken — bei sehr kurzen Rennen ist die Ausgleichswirkung begrenzt.

*Hinweis: Dieser Abschnitt enthält ausschließlich statistische Beurteilungen, keine Code-Empfehlungen.*
