# LBB-WITHDRAW — Copilot settlement (read-only)

## Verdict

The contradiction is real but it is caused by population and observability mixing, not by incompatible raw data.
Both quoted counts are reproducible from the same dump family once definitions are fixed.

Correction to my own prior framing: I over-generalized the boundary-driven result from the sustained-failure subset to the full withdrawal population. That was too broad.

## Source check: ambiguity around dir

Identifiers checked at source: dT, dTStart, chooseFreeLaneDir, dir, takeFreeLane.

Result: the ambiguity is conceptually real in control flow, but in these dumps it is mostly disambiguated by observables:
- when (a) fails (dT <= dTStart), recorded dir is null and gate payload is absent.
- when (a) holds and side closes, recorded dir is 0 and trace-3 gate payload includes why=blocked and blocker IDs.
- both in same frame does not occur in this dataset.

## Population definitions (explicit)

P1 Broad withdrawals (count 267): transition on same trailer|leader pair, contiguous frame, from takeFreeLane=true with nonzero dir to takeFreeLane=false.
P2 Sustained failures (matches prior 74/67 family): runs length >= 12 frames; end-of-run reach criterion (final residual <=10% of initial span).

## Classification results

P1 broad (n=267): a_failed=219, a_held_side_closed=43, both_same_frame=0, neither=5.
P2 sustained-end withdrawals (n=67): a_failed=58, a_held_side_closed=9, both_same_frame=0, neither=0.
P2 boundary proximity: |dT-dTStart|<=0.00025 on 65/67.
P2 median last-true margin: 8.946849e-6.
P2 median first-false margin: -6.202054e-6.

Interpretation of contradiction:
- The 267 claim was not valid as 100% side-closed; in this dump it is 43/267 side-closed and 219/267 room-failed.
- The 74/67 result is a narrower sustained-end subset, where room-failed frames dominate and cluster at the boundary.

## Third-reason bucket (neither)

There are 5 P1 cases with dT>dTStart, dir=null, no gate payload.
This means chooseFreeLaneDir was not observed as evaluated despite (a) passing.
Most plausible gate before chooseFreeLaneDir is the slowerLeaderOk/heroPass check.
Missing fields to prove that exactly: trailerDenom, leaderRawSpeed, lookBeforeBrakeMinDifferential threshold decision, and heroPass state.

## Side-by-side withdrawal facts (requested)

Columns: pop, frame, trailer, leader, margin=dT-dTStart, a_holds, chooseEvaluated, dir, leftBlocker, rightBlocker, bucket.

| pop | frame | trailer | leader | margin | a_holds | chooseEvaluated | dir | leftBlocker | rightBlocker | bucket |
|---|---:|---:|---:|---:|:--:|:--:|:--:|---:|---:|---|
| P1 | 2109 | 24 | 5 | 4.490470e-4 | Y | Y | 0 | 16 | 37 | a_held_side_closed |
| P1 | 3328 | 29 | 15 | -6.874614e-6 | N | N | null |  |  | a_failed |
| P1 | 1888 | 39 | 33 | -5.369827e-6 | N | N | null |  |  | a_failed |
| P1 | 1686 | 11 | 17 | -2.809300e-5 | N | N | null |  |  | a_failed |
| P1 | 34 | 25 | 24 | -2.277920e-6 | N | N | null |  |  | a_failed |
| P1 | 30 | 16 | 12 | -2.565205e-5 | N | N | null |  |  | a_failed |
| P1 | 48 | 16 | 26 | -3.143695e-7 | N | N | null |  |  | a_failed |
| P1 | 1983 | 14 | 28 | -7.086478e-6 | N | N | null |  |  | a_failed |
| P1 | 1746 | 11 | 15 | -4.922899e-5 | N | N | null |  |  | a_failed |
| P1 | 1572 | 17 | 21 | -6.044009e-6 | N | N | null |  |  | a_failed |
| P1 | 569 | 13 | 39 | -3.805460e-6 | N | N | null |  |  | a_failed |
| P1 | 942 | 13 | 39 | -6.225356e-6 | N | N | null |  |  | a_failed |
| P1 | 1115 | 13 | 39 | 2.195347e-6 | Y | N | null |  |  | neither |
| P1 | 1569 | 13 | 39 | -3.171674e-6 | N | N | null |  |  | a_failed |
| P1 | 1572 | 13 | 39 | -2.992085e-6 | N | N | null |  |  | a_failed |
| P1 | 1575 | 13 | 39 | -2.813138e-6 | N | N | null |  |  | a_failed |
| P1 | 1578 | 13 | 39 | -2.635125e-6 | N | N | null |  |  | a_failed |
| P1 | 1580 | 13 | 39 | -5.174082e-6 | N | N | null |  |  | a_failed |
| P1 | 1583 | 13 | 39 | -4.998422e-6 | N | N | null |  |  | a_failed |
| P1 | 1586 | 13 | 39 | -4.824740e-6 | N | N | null |  |  | a_failed |
| P1 | 1589 | 13 | 39 | -4.653528e-6 | N | N | null |  |  | a_failed |
| P1 | 1592 | 13 | 39 | -9.857105e-6 | N | N | null |  |  | a_failed |
| P1 | 1639 | 13 | 39 | -5.369167e-6 | N | N | null |  |  | a_failed |
| P1 | 1643 | 13 | 39 | -5.845668e-6 | N | N | null |  |  | a_failed |
| P1 | 1647 | 13 | 39 | -6.381796e-6 | N | N | null |  |  | a_failed |
| P1 | 1693 | 13 | 39 | -6.470812e-6 | N | N | null |  |  | a_failed |
| P1 | 1698 | 13 | 39 | -5.480714e-6 | N | N | null |  |  | a_failed |
| P1 | 1702 | 13 | 39 | -6.398482e-6 | N | N | null |  |  | a_failed |
| P1 | 1707 | 13 | 39 | -5.441036e-6 | N | N | null |  |  | a_failed |
| P1 | 1711 | 13 | 39 | -6.379973e-6 | N | N | null |  |  | a_failed |
| P1 | 1716 | 13 | 39 | -5.443475e-6 | N | N | null |  |  | a_failed |
| P1 | 1720 | 13 | 39 | -6.395259e-6 | N | N | null |  |  | a_failed |
| P1 | 1725 | 13 | 39 | -5.470606e-6 | N | N | null |  |  | a_failed |
| P1 | 1729 | 13 | 39 | -6.428995e-6 | N | N | null |  |  | a_failed |
| P1 | 1734 | 13 | 39 | -5.509684e-6 | N | N | null |  |  | a_failed |
| P1 | 1738 | 13 | 39 | -6.470517e-6 | N | N | null |  |  | a_failed |
| P1 | 1743 | 13 | 39 | -5.552647e-6 | N | N | null |  |  | a_failed |
| P1 | 1747 | 13 | 39 | -6.513842e-6 | N | N | null |  |  | a_failed |
| P1 | 1752 | 13 | 39 | -5.596049e-6 | N | N | null |  |  | a_failed |
| P1 | 1756 | 13 | 39 | -6.558696e-6 | N | N | null |  |  | a_failed |
| P1 | 1761 | 13 | 39 | -5.658830e-6 | N | N | null |  |  | a_failed |
| P1 | 1766 | 13 | 39 | -4.813635e-6 | N | N | null |  |  | a_failed |
| P1 | 1770 | 13 | 39 | -5.913495e-6 | N | N | null |  |  | a_failed |
| P1 | 1775 | 13 | 39 | -5.338943e-6 | N | N | null |  |  | a_failed |
| P1 | 1780 | 13 | 39 | -5.052646e-6 | N | N | null |  |  | a_failed |
| P1 | 1784 | 13 | 39 | -6.814403e-6 | N | N | null |  |  | a_failed |
| P1 | 1790 | 13 | 39 | -5.881985e-6 | N | N | null |  |  | a_failed |
| P1 | 1796 | 13 | 39 | -6.022505e-6 | N | N | null |  |  | a_failed |
| P1 | 1803 | 13 | 39 | -6.899884e-7 | N | N | null |  |  | a_failed |
| P1 | 1808 | 13 | 39 | -1.177311e-6 | N | N | null |  |  | a_failed |
| P1 | 1812 | 13 | 39 | -1.016906e-6 | N | N | null |  |  | a_failed |
| P1 | 1816 | 13 | 39 | -2.046981e-6 | N | N | null |  |  | a_failed |
| P1 | 1819 | 13 | 39 | -1.549149e-6 | N | N | null |  |  | a_failed |
| P1 | 1822 | 13 | 39 | -1.877794e-6 | N | N | null |  |  | a_failed |
| P1 | 69 | 25 | 5 | -9.609768e-7 | N | N | null |  |  | a_failed |
| P1 | 114 | 25 | 5 | -8.869828e-7 | N | N | null |  |  | a_failed |
| P1 | 73 | 16 | 21 | -1.325875e-6 | N | N | null |  |  | a_failed |
| P1 | 84 | 25 | 38 | -1.972348e-6 | N | N | null |  |  | a_failed |
| P1 | 1458 | 8 | 21 | 4.508812e-4 | Y | Y | 0 | 17 | 16 | a_held_side_closed |
| P1 | 1758 | 17 | 15 | -1.160297e-5 | N | N | null |  |  | a_failed |
| P1 | 2147 | 12 | 15 | -5.991176e-6 | N | N | null |  |  | a_failed |
| P1 | 2043 | 13 | 23 | -3.842556e-5 | N | N | null |  |  | a_failed |
| P1 | 436 | 20 | 24 | 6.507721e-5 | Y | Y | 0 | 36 | 0 | a_held_side_closed |
| P1 | 440 | 20 | 24 | 5.797857e-5 | Y | Y | 0 | 36 | 0 | a_held_side_closed |
| P1 | 2318 | 13 | 4 | 1.283852e-4 | Y | Y | 0 | 37 | 0 | a_held_side_closed |
| P1 | 2848 | 13 | 4 | 3.556524e-4 | Y | N | null |  |  | neither |
| P1 | 336 | 30 | 33 | 1.058709e-4 | Y | Y | 0 | 15 | 2 | a_held_side_closed |
| P1 | 371 | 30 | 33 | 1.000459e-4 | Y | Y | 0 | 15 | 2 | a_held_side_closed |
| P1 | 659 | 30 | 33 | 5.887415e-6 | Y | Y | 0 | 15 | 2 | a_held_side_closed |
| P1 | 883 | 30 | 33 | 1.679123e-4 | Y | Y | 0 | 15 | 32 | a_held_side_closed |
| P1 | 750 | 22 | 18 | -1.201405e-7 | N | N | null |  |  | a_failed |
| P1 | 3455 | 37 | 23 | -4.733499e-6 | N | N | null |  |  | a_failed |
| P1 | 1434 | 26 | 11 | -1.232818e-5 | N | N | null |  |  | a_failed |
| P1 | 1893 | 11 | 21 | -1.395011e-6 | N | N | null |  |  | a_failed |
| P1 | 1948 | 11 | 16 | 7.240684e-5 | Y | Y | 0 | 21 | 24 | a_held_side_closed |
| P1 | 3205 | 11 | 16 | 1.410495e-4 | Y | Y | 0 | 21 | 2 | a_held_side_closed |
| P1 | 3207 | 11 | 16 | 1.510732e-4 | Y | Y | 0 | 21 | 2 | a_held_side_closed |
| P1 | 500 | 36 | 4 | -6.154738e-7 | N | N | null |  |  | a_failed |
| P1 | 506 | 36 | 4 | -8.828512e-7 | N | N | null |  |  | a_failed |
| P1 | 511 | 36 | 4 | -1.311816e-7 | N | N | null |  |  | a_failed |
| P1 | 517 | 36 | 4 | -1.421887e-6 | N | N | null |  |  | a_failed |
| P1 | 521 | 36 | 4 | -1.469741e-7 | N | N | null |  |  | a_failed |
| P1 | 1510 | 23 | 9 | -9.214922e-6 | N | N | null |  |  | a_failed |
| P1 | 1605 | 23 | 9 | -9.164099e-7 | N | N | null |  |  | a_failed |
| P1 | 1611 | 23 | 9 | -6.651445e-7 | N | N | null |  |  | a_failed |
| P1 | 1617 | 23 | 9 | -3.749841e-7 | N | N | null |  |  | a_failed |
| P1 | 1624 | 23 | 9 | -9.931329e-7 | N | N | null |  |  | a_failed |
| P1 | 1628 | 23 | 9 | 3.596880e-6 | Y | N | null |  |  | neither |
| P1 | 681 | 32 | 30 | -1.007974e-5 | N | N | null |  |  | a_failed |
| P1 | 720 | 7 | 23 | -4.918730e-6 | N | N | null |  |  | a_failed |
| P1 | 1900 | 18 | 14 | -6.574643e-6 | N | N | null |  |  | a_failed |
| P1 | 1915 | 18 | 14 | -1.852241e-6 | N | N | null |  |  | a_failed |
| P1 | 1917 | 18 | 14 | -8.435356e-7 | N | N | null |  |  | a_failed |
| P1 | 1920 | 18 | 14 | -3.637327e-6 | N | N | null |  |  | a_failed |
| P1 | 1965 | 18 | 14 | -1.452984e-6 | N | N | null |  |  | a_failed |
| P1 | 1991 | 18 | 14 | -2.659283e-6 | N | N | null |  |  | a_failed |
| P1 | 1994 | 18 | 14 | -4.644956e-6 | N | N | null |  |  | a_failed |
| P1 | 1998 | 18 | 14 | -4.531719e-6 | N | N | null |  |  | a_failed |
| P1 | 2002 | 18 | 14 | -4.418481e-6 | N | N | null |  |  | a_failed |
| P1 | 2006 | 18 | 14 | -4.305244e-6 | N | N | null |  |  | a_failed |
| P1 | 2010 | 18 | 14 | -4.192006e-6 | N | N | null |  |  | a_failed |
| P1 | 2083 | 22 | 3 | 4.691338e-4 | Y | Y | 0 | 36 | 39 | a_held_side_closed |
| P1 | 2100 | 22 | 3 | 3.819575e-4 | Y | Y | 0 | 36 | 8 | a_held_side_closed |
| P1 | 2647 | 22 | 3 | -1.736624e-5 | N | N | null |  |  | a_failed |
| P1 | 799 | 27 | 30 | -1.619476e-5 | N | N | null |  |  | a_failed |
| P1 | 779 | 22 | 28 | 4.580714e-4 | Y | Y | 0 | 3 | 31 | a_held_side_closed |
| P1 | 792 | 32 | 2 | 4.230394e-4 | Y | Y | 0 | 30 | 23 | a_held_side_closed |
| P1 | 830 | 32 | 2 | 2.570849e-4 | Y | Y | 0 | 30 | 23 | a_held_side_closed |
| P1 | 858 | 32 | 2 | 1.324479e-4 | Y | Y | 0 | 30 | 23 | a_held_side_closed |
| P1 | 870 | 32 | 2 | 7.392110e-5 | Y | Y | 0 | 30 | 23 | a_held_side_closed |
| P1 | 884 | 32 | 2 | -1.075786e-5 | N | N | null |  |  | a_failed |
| P1 | 824 | 27 | 15 | 2.687978e-4 | Y | Y | 0 | 10 | 30 | a_held_side_closed |
| P1 | 858 | 32 | 33 | 2.356128e-4 | Y | Y | 0 | 30 | 23 | a_held_side_closed |
| P1 | 1157 | 19 | 24 | -1.681639e-6 | N | N | null |  |  | a_failed |
| P1 | 1159 | 19 | 24 | -2.443225e-6 | N | N | null |  |  | a_failed |
| P1 | 1161 | 19 | 24 | -3.636020e-6 | N | N | null |  |  | a_failed |
| P1 | 1164 | 19 | 24 | -1.991467e-6 | N | N | null |  |  | a_failed |
| P1 | 1166 | 19 | 24 | -4.384948e-6 | N | N | null |  |  | a_failed |
| P1 | 1177 | 19 | 24 | -7.491375e-7 | N | N | null |  |  | a_failed |
| P1 | 1182 | 19 | 24 | -1.353269e-6 | N | N | null |  |  | a_failed |
| P1 | 1185 | 19 | 24 | -7.701130e-7 | N | N | null |  |  | a_failed |
| P1 | 1188 | 19 | 24 | -2.113872e-6 | N | N | null |  |  | a_failed |
| P1 | 1190 | 19 | 24 | -1.384759e-6 | N | N | null |  |  | a_failed |
| P1 | 1192 | 19 | 24 | -1.577727e-6 | N | N | null |  |  | a_failed |
| P1 | 1194 | 19 | 24 | -2.656170e-6 | N | N | null |  |  | a_failed |
| P1 | 1196 | 19 | 24 | -4.581611e-6 | N | N | null |  |  | a_failed |
| P1 | 1199 | 19 | 24 | -4.838385e-6 | N | N | null |  |  | a_failed |
| P1 | 1203 | 19 | 24 | -5.042987e-6 | N | N | null |  |  | a_failed |
| P1 | 1208 | 19 | 24 | -7.049198e-6 | N | N | null |  |  | a_failed |
| P1 | 1152 | 4 | 0 | -6.848209e-6 | N | N | null |  |  | a_failed |
| P1 | 2168 | 21 | 27 | -1.241233e-5 | N | N | null |  |  | a_failed |
| P1 | 1108 | 20 | 7 | 2.161952e-4 | Y | Y | 0 | 0 | 25 | a_held_side_closed |
| P1 | 1704 | 26 | 17 | -2.177986e-5 | N | N | null |  |  | a_failed |
| P1 | 1193 | 21 | 15 | 3.650844e-5 | Y | N | null |  |  | neither |
| P1 | 1295 | 21 | 15 | -1.372289e-6 | N | N | null |  |  | a_failed |
| P1 | 2230 | 2 | 32 | 3.980667e-4 | Y | Y | 0 | 16 | 5 | a_held_side_closed |
| P1 | 1243 | 20 | 23 | 4.569426e-4 | Y | Y | 0 | 0 | 25 | a_held_side_closed |
| P1 | 1758 | 16 | 19 | -5.688648e-6 | N | N | null |  |  | a_failed |
| P1 | 1410 | 23 | 7 | -1.139387e-5 | N | N | null |  |  | a_failed |
| P1 | 1306 | 17 | 8 | -6.235661e-7 | N | N | null |  |  | a_failed |
| P1 | 1678 | 25 | 23 | -3.972785e-6 | N | N | null |  |  | a_failed |
| P1 | 1319 | 3 | 11 | -2.094652e-5 | N | N | null |  |  | a_failed |
| P1 | 1330 | 7 | 32 | -2.936098e-5 | N | N | null |  |  | a_failed |
| P1 | 1400 | 7 | 9 | -7.980612e-6 | N | N | null |  |  | a_failed |
| P1 | 1849 | 30 | 27 | -1.093747e-5 | N | N | null |  |  | a_failed |
| P1 | 1429 | 20 | 2 | -1.363039e-5 | N | N | null |  |  | a_failed |
| P1 | 3190 | 19 | 38 | -2.724232e-6 | N | N | null |  |  | a_failed |
| P1 | 1494 | 16 | 24 | 4.163399e-4 | Y | Y | 0 | 3 | 4 | a_held_side_closed |
| P1 | 1581 | 25 | 2 | -1.288904e-6 | N | N | null |  |  | a_failed |
| P1 | 3079 | 5 | 32 | -9.276483e-6 | N | N | null |  |  | a_failed |
| P1 | 1695 | 0 | 2 | -4.753115e-5 | N | N | null |  |  | a_failed |
| P1 | 1758 | 11 | 3 | 5.438944e-5 | Y | Y | 0 | 15 | 8 | a_held_side_closed |
| P1 | 1806 | 24 | 20 | 1.458914e-4 | Y | Y | 0 | 16 | 0 | a_held_side_closed |
| P1 | 1811 | 24 | 20 | 9.826762e-5 | Y | Y | 0 | 16 | 0 | a_held_side_closed |
| P1 | 1821 | 24 | 20 | -1.406863e-5 | N | N | null |  |  | a_failed |
| P1 | 1846 | 16 | 35 | 1.534414e-4 | Y | Y | 0 | 21 | 24 | a_held_side_closed |
| P1 | 1862 | 36 | 33 | -2.778546e-5 | N | N | null |  |  | a_failed |
| P1 | 1905 | 36 | 8 | -1.163032e-6 | N | N | null |  |  | a_failed |
| P1 | 1904 | 21 | 35 | -2.534644e-5 | N | N | null |  |  | a_failed |
| P1 | 3141 | 33 | 8 | -9.211083e-6 | N | N | null |  |  | a_failed |
| P1 | 1951 | 0 | 37 | -6.207120e-6 | N | N | null |  |  | a_failed |
| P1 | 2064 | 23 | 20 | -1.507417e-6 | N | N | null |  |  | a_failed |
| P1 | 1948 | 11 | 35 | 2.504718e-4 | Y | Y | 0 | 21 | 24 | a_held_side_closed |
| P1 | 1963 | 0 | 9 | -3.197685e-5 | N | N | null |  |  | a_failed |
| P1 | 2382 | 35 | 16 | -1.940191e-5 | N | N | null |  |  | a_failed |
| P1 | 2447 | 15 | 36 | 3.274296e-4 | Y | Y | 0 | 12 | 33 | a_held_side_closed |
| P1 | 3334 | 31 | 29 | -2.636629e-6 | N | N | null |  |  | a_failed |
| P1 | 3341 | 31 | 29 | -9.423959e-6 | N | N | null |  |  | a_failed |
| P1 | 3369 | 31 | 29 | -1.263422e-6 | N | N | null |  |  | a_failed |
| P1 | 3373 | 31 | 29 | -1.612978e-6 | N | N | null |  |  | a_failed |
| P1 | 2068 | 22 | 8 | -1.026552e-5 | N | N | null |  |  | a_failed |
| P1 | 2064 | 14 | 33 | -1.513729e-5 | N | N | null |  |  | a_failed |
| P1 | 2057 | 1 | 15 | 2.534768e-4 | Y | Y | 0 | 17 | 12 | a_held_side_closed |
| P1 | 2086 | 2 | 16 | 4.720029e-4 | Y | Y | 0 | 35 | 20 | a_held_side_closed |
| P1 | 2125 | 39 | 23 | -2.170816e-5 | N | N | null |  |  | a_failed |
| P1 | 2207 | 29 | 33 | -3.193416e-6 | N | N | null |  |  | a_failed |
| P1 | 3272 | 24 | 6 | -4.431317e-6 | N | N | null |  |  | a_failed |
| P1 | 2229 | 13 | 37 | -6.118127e-6 | N | N | null |  |  | a_failed |
| P1 | 2247 | 28 | 8 | 4.684061e-4 | Y | Y | 0 | 15 | 14 | a_held_side_closed |
| P1 | 2656 | 28 | 8 | -1.535767e-5 | N | N | null |  |  | a_failed |
| P1 | 2285 | 8 | 20 | -1.958882e-5 | N | N | null |  |  | a_failed |
| P1 | 2318 | 13 | 9 | 2.496221e-4 | Y | Y | 0 | 37 | 0 | a_held_side_closed |
| P1 | 2348 | 35 | 32 | -1.804924e-5 | N | N | null |  |  | a_failed |
| P1 | 2786 | 27 | 21 | 3.099160e-4 | Y | N | null |  |  | neither |
| P1 | 2372 | 39 | 37 | -2.152637e-5 | N | N | null |  |  | a_failed |
| P1 | 2413 | 14 | 20 | -2.496344e-5 | N | N | null |  |  | a_failed |
| P1 | 2430 | 1 | 35 | -2.497349e-5 | N | N | null |  |  | a_failed |
| P1 | 2752 | 12 | 36 | -9.384161e-8 | N | N | null |  |  | a_failed |
| P1 | 2762 | 12 | 36 | -4.794534e-7 | N | N | null |  |  | a_failed |
| P1 | 2764 | 12 | 36 | -4.326654e-6 | N | N | null |  |  | a_failed |
| P1 | 2767 | 12 | 36 | -5.918221e-6 | N | N | null |  |  | a_failed |
| P1 | 2771 | 12 | 36 | -5.254154e-6 | N | N | null |  |  | a_failed |
| P1 | 2775 | 12 | 36 | -4.590087e-6 | N | N | null |  |  | a_failed |
| P1 | 2779 | 12 | 36 | -3.926020e-6 | N | N | null |  |  | a_failed |
| P1 | 2782 | 12 | 36 | -5.517587e-6 | N | N | null |  |  | a_failed |
| P1 | 2786 | 12 | 36 | -4.853520e-6 | N | N | null |  |  | a_failed |
| P1 | 2790 | 12 | 36 | -4.189454e-6 | N | N | null |  |  | a_failed |
| P1 | 2793 | 12 | 36 | -5.781021e-6 | N | N | null |  |  | a_failed |
| P1 | 2797 | 12 | 36 | -5.116954e-6 | N | N | null |  |  | a_failed |
| P1 | 2801 | 12 | 36 | -4.452887e-6 | N | N | null |  |  | a_failed |
| P1 | 2804 | 12 | 36 | -6.044454e-6 | N | N | null |  |  | a_failed |
| P1 | 2808 | 12 | 36 | -5.380387e-6 | N | N | null |  |  | a_failed |
| P1 | 2479 | 23 | 5 | 2.229075e-4 | Y | Y | 0 | 32 | 37 | a_held_side_closed |
| P1 | 2501 | 39 | 25 | 2.059196e-4 | Y | Y | 0 | 34 | 9 | a_held_side_closed |
| P1 | 2646 | 8 | 32 | -3.005078e-6 | N | N | null |  |  | a_failed |
| P1 | 2699 | 6 | 7 | -1.201731e-5 | N | N | null |  |  | a_failed |
| P1 | 2775 | 31 | 17 | -7.086532e-6 | N | N | null |  |  | a_failed |
| P1 | 3181 | 11 | 26 | -2.668071e-6 | N | N | null |  |  | a_failed |
| P1 | 3185 | 11 | 26 | -5.687115e-6 | N | N | null |  |  | a_failed |
| P1 | 3191 | 11 | 26 | -6.326076e-6 | N | N | null |  |  | a_failed |
| P1 | 3196 | 11 | 26 | -4.674293e-9 | N | N | null |  |  | a_failed |
| P1 | 3203 | 11 | 26 | -5.611688e-7 | N | N | null |  |  | a_failed |
| P1 | 3205 | 11 | 26 | 4.484161e-6 | Y | Y | 0 | 21 | 2 | a_held_side_closed |
| P1 | 3207 | 11 | 26 | 9.458828e-6 | Y | Y | 0 | 21 | 2 | a_held_side_closed |
| P1 | 2721 | 8 | 2 | 4.588268e-4 | Y | Y | 0 | 3 | 28 | a_held_side_closed |
| P1 | 2753 | 1 | 19 | -1.459927e-5 | N | N | null |  |  | a_failed |
| P1 | 2763 | 28 | 32 | -7.950602e-6 | N | N | null |  |  | a_failed |
| P1 | 2809 | 36 | 22 | -4.104444e-6 | N | N | null |  |  | a_failed |
| P1 | 2830 | 15 | 8 | 1.066330e-4 | Y | Y | 0 | 36 | 20 | a_held_side_closed |
| P1 | 2838 | 15 | 8 | -4.648690e-6 | N | N | null |  |  | a_failed |
| P1 | 3115 | 19 | 1 | -5.127156e-6 | N | N | null |  |  | a_failed |
| P1 | 2850 | 28 | 23 | 4.266391e-4 | Y | Y | 0 | 14 | 37 | a_held_side_closed |
| P1 | 2930 | 1 | 38 | -9.171075e-7 | N | N | null |  |  | a_failed |
| P1 | 2988 | 36 | 35 | -5.970874e-6 | N | N | null |  |  | a_failed |
| P1 | 3081 | 12 | 35 | -7.116506e-7 | N | N | null |  |  | a_failed |
| P1 | 3085 | 12 | 3 | -9.543698e-6 | N | N | null |  |  | a_failed |
| P1 | 3387 | 27 | 36 | -1.679971e-5 | N | N | null |  |  | a_failed |
| P1 | 3096 | 5 | 23 | -1.061601e-5 | N | N | null |  |  | a_failed |
| P1 | 3102 | 5 | 14 | -3.258664e-5 | N | N | null |  |  | a_failed |
| P1 | 3117 | 12 | 22 | 2.224705e-4 | Y | Y | 0 | 27 | 3 | a_held_side_closed |
| P1 | 3229 | 30 | 1 | -1.207722e-6 | N | N | null |  |  | a_failed |
| P1 | 3231 | 30 | 1 | -2.222476e-6 | N | N | null |  |  | a_failed |
| P1 | 3233 | 30 | 1 | -3.237489e-6 | N | N | null |  |  | a_failed |
| P1 | 3235 | 30 | 1 | -4.252544e-6 | N | N | null |  |  | a_failed |
| P1 | 3238 | 30 | 1 | -1.737153e-6 | N | N | null |  |  | a_failed |
| P1 | 3240 | 30 | 1 | -2.753135e-6 | N | N | null |  |  | a_failed |
| P1 | 3242 | 30 | 1 | -3.769138e-6 | N | N | null |  |  | a_failed |
| P1 | 3245 | 30 | 1 | -1.254580e-6 | N | N | null |  |  | a_failed |
| P1 | 3247 | 30 | 1 | -2.270623e-6 | N | N | null |  |  | a_failed |
| P1 | 3249 | 30 | 1 | -3.287343e-6 | N | N | null |  |  | a_failed |
| P1 | 3251 | 30 | 1 | -4.307137e-6 | N | N | null |  |  | a_failed |
| P1 | 3254 | 30 | 1 | -1.813951e-6 | N | N | null |  |  | a_failed |
| P1 | 3256 | 30 | 1 | -2.864474e-6 | N | N | null |  |  | a_failed |
| P1 | 3258 | 30 | 1 | -3.941537e-6 | N | N | null |  |  | a_failed |
| P1 | 3261 | 30 | 1 | -1.592922e-6 | N | N | null |  |  | a_failed |
| P1 | 3263 | 30 | 1 | -2.788714e-6 | N | N | null |  |  | a_failed |
| P1 | 3265 | 30 | 1 | -4.000808e-6 | N | N | null |  |  | a_failed |
| P1 | 3268 | 30 | 1 | -1.778502e-6 | N | N | null |  |  | a_failed |
| P1 | 3270 | 30 | 1 | -2.971870e-6 | N | N | null |  |  | a_failed |
| P1 | 3272 | 30 | 1 | -4.159940e-6 | N | N | null |  |  | a_failed |
| P1 | 3275 | 30 | 1 | -1.911508e-6 | N | N | null |  |  | a_failed |
| P1 | 3277 | 30 | 1 | -3.117711e-6 | N | N | null |  |  | a_failed |
| P1 | 3279 | 30 | 1 | -4.327832e-6 | N | N | null |  |  | a_failed |
| P1 | 3282 | 30 | 1 | -2.097495e-6 | N | N | null |  |  | a_failed |
| P1 | 3284 | 30 | 1 | -3.267925e-6 | N | N | null |  |  | a_failed |
| P1 | 3286 | 30 | 1 | -4.387755e-6 | N | N | null |  |  | a_failed |
| P1 | 3289 | 30 | 1 | -2.031410e-6 | N | N | null |  |  | a_failed |
| P1 | 3291 | 30 | 1 | -3.148889e-6 | N | N | null |  |  | a_failed |
| P1 | 3302 | 30 | 1 | -4.374230e-6 | N | N | null |  |  | a_failed |
| P1 | 3305 | 30 | 1 | -2.170615e-6 | N | N | null |  |  | a_failed |
| P1 | 3413 | 6 | 13 | -3.972255e-6 | N | N | null |  |  | a_failed |
| P1 | 3417 | 6 | 13 | -5.900487e-6 | N | N | null |  |  | a_failed |
| P1 | 3340 | 29 | 20 | -4.694658e-6 | N | N | null |  |  | a_failed |
| P1 | 3420 | 24 | 13 | -6.202054e-6 | N | N | null |  |  | a_failed |
| P1 | 3374 | 29 | 14 | -3.602833e-6 | N | N | null |  |  | a_failed |
| P1 | 3376 | 29 | 5 | -5.608467e-6 | N | N | null |  |  | a_failed |
| P1 | 3519 | 31 | 8 | -1.335378e-5 | N | N | null |  |  | a_failed |

Top blocker IDs among side-closed P1 withdrawals (counting left+right blocker entries):
- racer 0: 8
- racer 2: 7
- racer 21: 7
- racer 15: 6
- racer 30: 6
- racer 16: 5
- racer 37: 5
- racer 36: 5
- racer 23: 5
- racer 3: 4
- racer 24: 3
- racer 17: 2

## Owner question: successful dodges and slack

Sustained runs (len>=12): 115.
Completed by end criterion: 41. Failed by end criterion: 74.
Completed by any-time criterion: 50.

End-completed distributions:
- duration frames p10/p50/p90: 16, 28, 54.0.
- min longitudinal margin (dT-dTStart) p10/p50/p90: 2.601138e-6, 2.274436e-5, 3.568613e-4.
- min lateral slack to closing (physicalY units) p10/p50/p90: 3.613583e-2, 1.159719e-1, 3.550170e-1.

## 37-frame replay (slower traverse)

End-completed base (n=41): long-survive=14 (34.1%), lat-survive=20 (48.8%), both=12 (29.3%).
Any-time-completed base (n=50): long-survive=18 (36.0%), lat-survive=24 (48.0%), both=15 (30.0%).

This dump therefore does not support "most completions have large slack" under a 37-frame replay; both-axis survival is about 30%.

## Success vs failure structure (end criterion)

- leader avoidanceActive share during run: success=11.8%, failure=33.5%.
- start traffic density in t-band (median neighbors): success=3, failure=3.5.
- start closing-rate proxy median (delta dT per frame): success=1.091554e-5, failure=1.596642e-5.
- start t quartiles success: 0.2250, 0.3282, 0.4259; failure: 0.1884, 0.2828, 0.3926.

## What is settled, and what remains unobservable

Settled from existing dumps:
- The 267 vs 74 contradiction is a definition/population mismatch, not contradictory raw rows.
- In this dataset, broad withdrawals are mostly room-failed, not side-closed.
- Sustained-end failures are strongly boundary-adjacent at withdrawal.
- Under 37-frame replay, only about 30% of currently completed runs survive on both axes.

Not observable with current captured fields:
- Exact causal proof for the 5 neither cases (likely slowerLeaderOk/heroPass gate), because raw speed-threshold decision fields are not logged.