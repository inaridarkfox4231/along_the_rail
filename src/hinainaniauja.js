// 3Dのfoldやってみたい

// A3, BC3, H3. 参考：https://ja.wikipedia.org/wiki/コクセター群

// 今回はH3を極めてみようかと。とりあえずアルキメデス。
// 表面上だけで相当いろいろ描画できる。
// (1.0, 0.0, 0.0):二十・十二面体
// (0.0, 1.0, 0.0):正二十面体
// (0.0, 0.0, 1.0):正十二面体
// (1.0 / sqrt(5.0), 0.0, 1.0 - 1.0 / sqrt(5.0)):切頂十二面体
// (2.0 / 3.0, 1.0 / 3.0, 0.0):切頂二十面体（サッカーボール型）// (0.5, 0.5, 0.0)？？？
// (0.0, k, 3.0)/(k + 3.0):斜方二十・十二面体（kは黄金比）
// ((t - 1.0) / 3.0, (t - 1.0) / 6.0, (3.0 - t) / 2.0):
// 斜方切頂二十・十二面体（tは√5）
// あと、変形二十面体についてはパリティ描画すれば
// ギリギリいけそう（色の塗り分けに相当することをやる・・
// あっちの方の正四面体で使ったテクニック）
// 変形二十面体むりぽい
// なので星型に行きます。

// ※1枚の場合はどの点でも基本同じ。サイズが違うだけ。

// 小星型十二面体
// (0,0,1)において(-0.5, 0, k*0.5) (kは黄金比）
// 大十二面体
// (0,0,1)において(0, k*0.5, 0.5)
// 大星型十二面体
// (0,0,1)において(0, -k*0.5, 0.5)
// 小三角六辺形二十面体
// (0,0,1)において(0, -k/6, (2k+1)/6)
// 正八面体の複合多面体（正二十面体の星型3）
// (0,0,1)において((k+1)/6, (k+1)/6, (k+1)/6)
// 菱形三十面体
// (0,0,1)において(0, 0, k*0.5)（隣り合う三角形が持ち上がり同一平面）

// 大二十面体
// (0,0,1)において((2k+1)/6, 0, k/6), (-(k+1)/6, -(k+1)/6, (k+1)/6)
// を法とする平面でminを取る。

// 完全二十面体。
// a=k/6, b=(2k+1)/6, kは黄金比とするとき、
// (0,0,1)において、(k/6, (2k+1)/6, 0), (-(2k+1)/6, 0, k/6)
// を法とする平面でmaxを取る。

// 十二・十二面体
// kは黄金比とするとき、
// (1,0,0)(というかpab)において(0, k/2, 1/2), (1/2, 0, k/2)
// を法とする平面でmaxを取る。

// foldを2回使ってみた。120個。圧巻ね。

// 増えてきたしまとめておわりにするかね
// ねじれ系がつくれなくて詰んでたんだけど、
// こだわりは捨てるべきよね。作らないとどうしようもない

// これも多分伸びないね
// パンチのきいた何かが必要なんでしょ。知らないけど。なんか、あれ、びっくりするような何かが。
// じゃないと「へー」で終わっちゃう。そういうことでしょ。思いつかないけど。そういうの思いつく人しか
// こういうことやっちゃいけないんだっていうのが最近になってようやくわかってきた。自分にはその資格が無いらしい。
// アーメン

// モーフィングめんどくさいから16種類を個別にボタンで切り替えられるようにする。

// わーーーーーーーかんねーーーーーーーーーーーーーーーーーーーーーどうなってる・・・・・・・

let myShader;

let vs =
"precision mediump float;" +
"attribute vec3 aPosition;" +
"void main(void){" +
"  gl_Position = vec4(aPosition, 1.0);" +
"}";

let fs =
"precision mediump float;" +
// uniform.
"uniform vec2 u_resolution;" +
"uniform vec2 u_mouse;" + // -1.0～1.0
"uniform float u_time;" +
"uniform int u_mode;" + // 0でauto, 1でmanual.
"uniform int u_type;" + // typeをあらわす整数。
"uniform float u_size;" + // サイズ調整
// 定数
"const float pi = 3.14159;" +
"const float goldenRatio = 0.5 * (1.0 + sqrt(5.0));" + // 黄金比
// グローバル
// まずは基本領域内の点（今回はひとつだけ）と鏡映面の法線ベクトル
// "vec3 uniqueP;" + // 今回はunique pointということでuniqueP. // uniquePはもう使わないので。
"vec3 na;" + // 第一鏡映面(1, 0, 0). yz平面での鏡映。
"vec3 nb;" + // 第二鏡映面(0, 1, 0). xz平面での鏡映。
"vec3 nc;" + // 第三鏡映面。第一、第二とのなす角は60°と180/n°になる。
// 次にそれらが作る面の法線ベクトル。
// 鏡映面の交線ベクトルを外積で作って正規化したもの。
// これを作る前のpab, pbc, pcaは正規化されていなくて、sizeに応じて
// 基本領域の境界を作っており重心座標によりuniquePを決めるのに使う。
// -na, -nb, -ncは左手系を作るので、
// cross(na, nb), cross(nb, nc), cross(nc, na)はこれらの平面の作る
// 立体から外に突き出してることに注意する。
"vec3 pab;" + // na, nb.
"vec3 pbc;" + // nb, nc.
"vec3 pca;" + // nc, na.
// 色関連
// 自由に取得するならgetRGBで。
"const vec3 black = vec3(0.2);" +
"const vec3 red = vec3(0.95, 0.3, 0.35);" +
"const vec3 orange = vec3(0.98, 0.49, 0.13);" +
"const vec3 yellow = vec3(0.95, 0.98, 0.2);" +
"const vec3 green = vec3(0.3, 0.9, 0.4);" +
"const vec3 lightgreen = vec3(0.7, 0.9, 0.1);" +
"const vec3 purple = vec3(0.6, 0.3, 0.98);" +
"const vec3 blue = vec3(0.2, 0.25, 0.98);" +
"const vec3 skyblue = vec3(0.1, 0.65, 0.9);" +
"const vec3 white = vec3(1.0);" +
"const vec3 aquamarine = vec3(0.47, 0.98, 0.78);" +
"const vec3 turquoise = vec3(0.25, 0.88, 0.81);" +
"const vec3 coral = vec3(1.0, 0.5, 0.31);" +
"const vec3 limegreen = vec3(0.19, 0.87, 0.19);" +
"const vec3 khaki = vec3(0.94, 0.90, 0.55);" +
"const vec3 navy = vec3(0.0, 0.0, 0.5);" +
"const vec3 silver = vec3(0.5);" +
"const vec3 gold = vec3(0.85, 0.67, 0.14);" +
// hsbで書かれた(0.0～1.0)の数値vec3をrgbに変換する魔法のコード
"vec3 getRGB(float h, float s, float b){" +
"  vec3 c = vec3(h, s, b);" +
"  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);" +
"  rgb = rgb * rgb * (3.0 - 2.0 * rgb);" +
"  return c.z * mix(vec3(1.0), rgb, c.y);" +
"}" +
// 双曲線関数
"float tanh(float x){" +
"  return (exp(x) - exp(-x)) / (exp(x) + exp(-x));" +
"}" +
// 初期化処理。gCoordは重心座標(全部足して1ですべて0.0以上)。
// まず正四面体の鏡映群(A3)の場合。
"void initialize(){" +
"  na = vec3(1.0, 0.0, 0.0);" +
"  nb = vec3(0.0, 1.0, 0.0);" +
"  nc = vec3(-0.5, -goldenRatio * 0.5, (goldenRatio - 1.0) * 0.5);" +
"  pab = vec3(0.0, 0.0, goldenRatio / 2.0);" +
"  pbc = vec3(0.5, 0.0, goldenRatio / 2.0);" +
"  pca = vec3(0.0, goldenRatio / 6.0, (1.0 + 2.0 * goldenRatio) / 6.0);" +
"}" +
// 折り畳み処理。A3の場合は3回。
// 具体的にはna, nb, ncのそれぞれについてそれと反対にあるときだけ
// 面で鏡写しにする。
"void fold(inout vec3 p){" +
"  for(int i = 0; i < 5; i++){" +
"    p -= 2.0 * min(0.0, dot(p, na)) * na;" +
"    p -= 2.0 * min(0.0, dot(p, nb)) * nb;" +
"    p -= 2.0 * min(0.0, dot(p, nc)) * nc;" +
"  }" +
"}" +
// pをfoldしつつiterationの回数を返す。
"float countFold(inout vec3 p){" +
"  float n = 0.0;" +
"  float q;" +
"  for(int i = 0; i < 5; i++){" +
"    q = dot(p, na);" +
"    if(q < 0.0){ n += 1.0; p -= 2.0 * q * na; }" +
"    q = dot(p, nb);" +
"    if(q < 0.0){ n += 1.0; p -= 2.0 * q * nb; }" +
"    q = dot(p, nc);" +
"    if(q < 0.0){ n += 1.0; p -= 2.0 * q * nc; }" +
"  }" +
"  return n;" +
"}" +
// ベクトルpのt回転。OK!
"vec2 rotate(vec2 p, float t){" +
"  return p * cos(t) + vec2(-p.y, p.x) * sin(t);" +
"}" +
// x, y, z軸周りの回転をまとめておきたい
// 汎用性を高めるにはvoidで書かない方がよい。こだわり捨ててね。
// x軸周り, yをzに移す回転。
"vec3 rotateX(vec3 p, float t){" +
"  p.yz = rotate(p.yz, t);" +
"  return p;" +
"}" +
// y軸周り、zをxに移す回転。上から見て反時計回り。
"vec3 rotateY(vec3 p, float t){" +
"  p.zx = rotate(p.zx, t);" +
"  return p;" +
"}" +
// z軸周り。xをyに移す回転。
"vec3 rotateZ(vec3 p, float t){" +
"  p.xy = rotate(p.xy, t);" +
"  return p;" +
"}" +
// 球。半径r.
// 中心cにしたいならcを引いて代入してね。
"float sphere(vec3 p, float r){" +
"  return length(p) - r;" +
"}" +
// 棒。原点からn方向、長さは両方向に無限、rは太さ。
"float bar(vec3 p, vec3 n, float r){" +
"  return length(p - dot(p, n) * n) - r;" +
"}" +
// 半分開いた棒。原点からnと逆方向に、長さ無限大。
// はじっこは丸くなってる。
"float halfBar(vec3 p, vec3 n, float r){" +
"  return length(p - min(0.0, dot(p, n)) * n) - r;" +
"}" +
// map関数。距離の見積もり関数.
// ここでdを更新するときに最後に更新されたオブジェクトのところがどこか
// を調べればオブジェクトごとの色分けができそうね。
// modeを指定してminかmaxか選べるようにしたい。そうすれば、
// 切頂したときに違う色にできる。
// 0のときminで更新、1のときmaxで更新するように変更。
// 2のとき新しい図形でのくりぬき
// これで平面スライスとかできるようになるはず
"void updateDist(out vec3 color, out float dist, vec3 c, float d, int modeId){" +
"  if(d < dist && modeId == 0){ color = c; dist = d; }" +
"  if(d > dist && modeId == 1){ color = c; dist = d; }" +
"  if(-d > dist && modeId == 2){ color = c; dist = -d; }" +
"}" +
"void singlePattern(inout vec3 color, inout float t, inout vec3 p, vec3 u, vec3 bodyColor){" +
"  vec3 q = p - u;" +
"  updateDist(color, t, bodyColor, max(max(dot(q, pab), dot(q, pbc)), dot(q, pca)), 0);" +
"}" +
"void ptn0(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pab * u_size;" +
"  singlePattern(color, t, p, u, red);" +
"  updateDist(color, t, silver, bar(p - u, nc, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn1(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pbc * u_size;" +
"  singlePattern(color, t, p, u, orange);" +
"  updateDist(color, t, silver, bar(p - u, na, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn2(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  singlePattern(color, t, p, u, yellow);" +
"  updateDist(color, t, silver, bar(p - u, nb, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn3(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = (pab * sqrt(1.0 / 5.0) + pca * (1.0 - sqrt(1.0 / 5.0))) * u_size;" +
"  singlePattern(color, t, p, u, green);" +
"  updateDist(color, t, silver, halfBar(p - u, nc, 0.01), 0);" +
"  updateDist(color, t, silver, halfBar(p - u, nb, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn4(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = (pab * (2.0 / 3.0) + pbc * (1.0 / 3.0)) * u_size;" +
"  singlePattern(color, t, p, u, lightgreen);" +
"  updateDist(color, t, silver, halfBar(p - u, nc, 0.01), 0);" +
"  updateDist(color, t, silver, halfBar(p - u, na, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn5(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = (pbc * (goldenRatio / (goldenRatio + 3.0)) + pca * (3.0 / (goldenRatio + 3.0))) * u_size;" +
"  singlePattern(color, t, p, u, purple);" +
"  updateDist(color, t, silver, halfBar(p - u, na, 0.01), 0);" +
"  updateDist(color, t, silver, halfBar(p - u, nb, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
// ((t - 1.0) / 3.0, (t - 1.0) / 6.0, (3.0 - t) / 2.0); // tは√5です
"void ptn6(inout vec3 color, inout float t, inout vec3 p){" +
"  float route_5 = sqrt(5.0);" +
"  vec3 u = (pab * ((route_5 - 1.0) / 3.0) + pbc * ((route_5 - 1.0) / 6.0) + pca * ((3.0 - route_5) / 2.0)) * u_size;" +
"  singlePattern(color, t, p, u, blue);" +
"  updateDist(color, t, silver, halfBar(p - u, na, 0.01), 0);" +
"  updateDist(color, t, silver, halfBar(p - u, nb, 0.01), 0);" +
"  updateDist(color, t, silver, halfBar(p - u, nc, 0.01), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn7(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, skyblue, dot(p - u, vec3(-0.5, 0.0, goldenRatio * 0.5)), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn8(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, aquamarine, dot(p - u, vec3(0.0, goldenRatio * 0.5, 0.5)), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn9(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, turquoise, dot(p - u, vec3(0.0, -goldenRatio * 0.5, 0.5)), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn10(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, coral, dot(p - u, vec3(0.0, -goldenRatio / 6.0, (2.0 * goldenRatio - 1.0) / 6.0)), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn11(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, limegreen, dot(p - u, vec3(goldenRatio + 1.0) / 6.0), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
"void ptn12(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, khaki, dot(p - u, vec3(0.0, 0.0, goldenRatio * 0.5)), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
// 大二十面体
// (0,0,1)において((2k+1)/6, 0, k/6), (-(k+1)/6, -(k+1)/6, (k+1)/6)
// を法とする平面でminを取る。
"void ptn13(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, navy, dot(p - u, vec3((2.0 * goldenRatio + 1.0) / 6.0, 0.0, goldenRatio / 6.0)), 0);" +
"  updateDist(color, t, navy, dot(p - u, vec3(-1.0, -1.0, 1.0) * ((goldenRatio + 1.0) / 6.0)), 0);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
// 完全二十面体。
// a=k/6, b=(2k+1)/6, kは黄金比とするとき、
// (0,0,1)において、(k/6, (2k+1)/6, 0), (-(2k+1)/6, 0, k/6)
// を法とする平面でmaxを取る。
"void ptn14(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pca * u_size;" +
"  updateDist(color, t, gold, dot(p - u, vec3((goldenRatio) / 6.0, (2.0 * goldenRatio + 1.0) / 6.0, 0.0)), 0);" +
"  updateDist(color, t, silver, dot(p - u, vec3(-(2.0 * goldenRatio + 1.0) / 6.0, 0.0, goldenRatio / 6.0)), 1);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
// 十二・十二面体
// kは黄金比とするとき、
// (1,0,0)(というかpab)において(0, k/2, 1/2), (1/2, 0, k/2)
// を法とする平面でmaxを取る。
"void ptn15(inout vec3 color, inout float t, inout vec3 p){" +
"  vec3 u = pab * u_size;" +
"  updateDist(color, t, gold, dot(p - u, vec3(0.0, goldenRatio * 0.5, 0.5)), 0);" +
"  updateDist(color, t, silver, dot(p - u, vec3(0.5, 0.0, goldenRatio * 0.5)), 1);" +
"  updateDist(color, t, black, sphere(p - u, 0.03), 0);" +
"}" +
// mapの返り値をvec4にしてはじめのxyzで色を表現してwで距離を表現する。
"vec4 map(vec3 p){" +
"  vec3 color = turquoise;" +
"  float t = 1e20;" +
"  float n = countFold(p);" +
"  if(u_type == 0){ ptn0(color, t, p); }" +
"  else if(u_type == 1){ ptn1(color, t, p); }" +
"  else if(u_type == 2){ ptn2(color, t, p); }" +
"  else if(u_type == 3){ ptn3(color, t, p); }" +
"  else if(u_type == 4){ ptn4(color, t, p); }" +
"  else if(u_type == 5){ ptn5(color, t, p); }" +
"  else if(u_type == 6){ ptn6(color, t, p); }" +
"  else if(u_type == 7){ ptn7(color, t, p); }" +
"  else if(u_type == 8){ ptn8(color, t, p); }" +
"  else if(u_type == 9){ ptn9(color, t, p); }" +
"  else if(u_type == 10){ ptn10(color, t, p); }" +
"  else if(u_type == 11){ ptn11(color, t, p); }" +
"  else if(u_type == 12){ ptn12(color, t, p); }" +
"  else if(u_type == 13){ ptn13(color, t, p); }" +
"  else if(u_type == 14){ ptn14(color, t, p); }" +
"  else if(u_type == 15){ ptn15(color, t, p); }" +
//"  updateDist(color, t, gold, dot(p - pca, vec3(-0.5, 0.0, 0.5 * k)), 0);" +
//"  updateDist(color, t, gold, dot(p - pab, vec3(0.0, k * 0.5, 0.5)), 0);" +
//"  updateDist(color, t, silver, dot(p - pab, vec3(0.5, 0.0, k * 0.5)), 1);" +
//"  updateDist(color, t, red, dot(p - pca, vec3(k + 1.0) / 6.0), 0);" +
//"  float t = sphere(p, 1.0);" +
//"  updateDist(color, t, turquoise, sphere(p - uniqueP, 0.05), 0);" +
//"  updateDist(color, t, red, halfBar(p - uniqueP, na, 0.02), 0);" +
//"  updateDist(color, t, green, halfBar(p - uniqueP, nb, 0.02), 0);" +
//"  updateDist(color, t, orange, halfBar(p - uniqueP, nc, 0.02), 0);" +
"  return vec4(color, t);" +
"}" +
// 法線ベクトルの取得
"vec3 calcNormal(vec3 p){" +
"  const vec2 eps = vec2(0.0001, 0.0);" +
// F(x, y, z) = 0があらわす曲面の、F(x, y, z)が正になる側の
// 法線を取得するための数学的処理。具体的には偏微分、分母はカット。
"  vec3 n;" +
"  n.x = map(p + eps.xyy).w - map(p - eps.xyy).w;" +
"  n.y = map(p + eps.yxy).w - map(p - eps.yxy).w;" +
"  n.z = map(p + eps.yyx).w - map(p - eps.yyx).w;" +
"  return normalize(n);" +
"}" +
// レイマーチングのメインコード
"float march(vec3 ray, vec3 camera){" +
"  const float maxd = 20.0;" + // 限界距離。これ越えたら無いとみなす。
"  const float precis = 0.001;" + // 精度。これより近付いたら到達とみなす。
"  const int ITERATION = 96;" + // マーチングループの回数
"  float h = precis * 2.0;" + // 毎フレームの見積もり関数の値。
// 初期値は0.0で初期化されてほしくないのでそうでない値を与えてる。
// これがprecisを下回れば到達とみなす
"  float t = 0.0;" +
// tはcameraからray方向に進んだ距離の累計。
// 到達ならこれが返る。失敗なら-1.0が返る。つまりresultが返る。
"  float result = -1.0;" +
"  for(int i = 0; i < ITERATION; i++){" +
"    if(h < precis || t > maxd){ break; }" +
// tだけ進んだ位置で見積もり関数の値hを取得し、tに足す。
"    h = map(camera + t * ray).w;" +
"    t += h;" +
"  }" +
// t < maxdなら、h < precisで返ったということなのでマーチング成功。
"  if(t < maxd){ result = t; }" +
"  return result;" +
"}" +
// カメラなどの回転。オート、マニュアル両方用意する
// x軸周り回転のピッチングとy軸周りのヨーイングだけ。
"void transform(out vec3 p){" +
"  if(u_mode == 2){ return; }" + // 停止
"  float angleX = pi * u_time * 0.27;" +
"  float angleY = pi * u_time * 0.13;" +
"  if(u_mode == 1){" +
"    angleX = pi * 0.5 * (2.0 * u_mouse.y - 1.0);" +
"    angleY = pi * 4.0 * (2.0 * u_mouse.x - 1.0);" +
"  }" +
"  p = rotateX(p, angleX);" +
"  p = rotateY(p, angleY);" +
"}" +
// 背景色。とりあえずデフォでいいよ。
"vec3 getBackground(vec2 p){" +
// まあこれだと空間がぐるぐるしてる感じがないからなー・・
// 体の色に合わせて変えてみるやつやってみました。
"  vec3 color = mix(gold, white, 0.7);" +
"  return color * (0.4 + p.y * 0.3);" +
"}" +
// 重心座標を返す関数（時間により）
/*
"vec3 getBaryCoord(){" +
"  float t = mod(u_time, 6.0);" +
"  float f = fract(u_time * 0.5);" +
"  if(t < 2.0){ return vec3(1.0 - f, f, 0.0); }" +
"  else if(t < 4.0){ return vec3(0.0, 1.0 - f, f); }" +
"  return vec3(f, 0.0, 1.0 - f);" +
"}" +
*/
// メインコード。
"void main(void){" +
"  vec2 p = (gl_FragCoord.xy - u_resolution.xy) / min(u_resolution.x, u_resolution.y);" +
// まずは背景色を取得。
"  vec3 color = getBackground(p);" +
// ray（目線）を設定。canvasは視点からz軸負方向1.8で。
"  vec3 ray = normalize(vec3(p, -1.8));" +
// camera（カメラ位置）を設定。z軸上、4.5のところ。
"  vec3 camera = vec3(0.0, 0.0, 4.5);" +
// 光源。rayの到達位置から生えるベクトル。気持ちz軸側くらい。
"  vec3 light = normalize(vec3(0.5, 0.8, 3.0));" +
// 目線、カメラ位置、光源をまとめて回転させる。
// ということはキャンバスも動くことになる。
// 今回対象物はその場に固定で、カメラの位置だけ半径4.5の球面上を
// 動かすこととし、光源などもまとめてそれに応じて動かす感じ。
// timeで動かしてるけどマウスでもいいと個人的には思う。
// autoかmanualでtransformする。バリデーションは中でやる。
"  transform(ray);" +
"  transform(camera);" +
"  transform(light);" +
// 初期化処理。
"  initialize();" +
// マーチングの結果を取得。
"  float t = march(ray, camera);" +
// tはマーチングに失敗すると-1.0が返る仕組みでその場合colorは
// 更新されずそこは背景色が割り当てられる。
// 先に体色を用意しておく。黄色っぽい。
"  if(t > -0.001){" +
"    vec3 pos = camera + t * ray;" + // 表面。
"    vec3 n = calcNormal(pos);" + // 法線取得
// 明るさ。内積の値に応じて0.3を最小とし1.0まで動かす。
"    float diff = clamp((dot(n, light) + 0.5) * 0.7, 0.3, 1.0);" +
"    vec3 baseColor = map(pos).xyz;" + // bodyColor取得。
"    baseColor *= diff;" +
// 遠くでフェードアウトするように調整する
"    color = mix(baseColor, color, tanh(t * 0.02));" +
"  }" +
// 以上。
"  gl_FragColor = vec4(color, 1.0);" +
"}";

let myCanvas;
let isLoop = true;
const AUTO = 0;
const MANUAL = 1;
const FIXED = 2;
// もしくはvec3とかにして具体的に指定して固定するのもありかもね
let mode; // 画面ぐるぐる。マニュアルかオートか。

let configGr;
let controlGr;
let typeId = 0;
let sizeFactor = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
								  1.0, 1.0, 1.0, 1.0, 1.0,
								  1.0, 1.0, 1.0, 0.5, 1.0];
const names = ["二十・十二面体", "正二十面体", "正十二面体", "切頂十二面体", "切頂二十面体", "斜方二十・十二",
							 "斜方切頂二十・十二", "小星型十二面体", "大十二面体", "大星型十二面体", "小三角六辺形二十面体",
							 "正八面体複合", "菱形三十面体", "大二十面体", "完全二十面体", "十二・十二面体"];
const namesEg = ["icosidodecahedron", "icosahedron", "dodecahedron", "truncated dodecahedron", "truncated icosahedron", "rhombicosidodecahedron",
							 "rhombitruncated icosidodecahedron", "Small stellated dodecahedron", "Great dodecahedron", "Great stellated dodecahedron", "small triambic icosahedron",
							 "Polyhedral compound of octahedrons", "rhombic triacontahedron", "Great icosahedron", "Final stellation of the icosahedron", "dodecadodecahedron"];

function setup(){
  createCanvas(800, 640);
  myCanvas = createGraphics(640, 640, WEBGL);
  myShader = myCanvas.createShader(vs, fs);
  myCanvas.shader(myShader);
	fill(255);
  textSize(32);
  textAlign(CENTER,CENTER);
  mode = AUTO;
	configGr = createGraphics(160, 640);
	controlGr = createGraphics(160, 640);
	prepareConfig();
	controlGr.stroke(0, 128, 255);
	controlGr.noFill();
	controlGr.strokeWeight(2.0);
}

function draw(){
  myShader.setUniform("u_resolution", [myCanvas.width, myCanvas.height]);
  let mx = constrain(mouseX / myCanvas.width, 0.0, 1.0);
  let my = 1.0 - constrain(mouseY / myCanvas.height, 0.0, 1.0);
  // マウスの値は0～1にしよう・・
  myShader.setUniform("u_mouse", [mx, my]);
  myShader.setUniform("u_time", millis() / 1000);
  myShader.setUniform("u_mode", mode);
	myShader.setUniform("u_type", typeId); // 0～15.
	myShader.setUniform("u_size", sizeFactor[typeId]);
  myCanvas.quad(-1, -1, -1, 1, 1, 1, 1, -1);
  image(myCanvas, 0, 0);
	image(configGr, 640, 0);
	controlGr.clear();
	controlGr.rect(0, 32 * typeId, 160, 32);
	image(controlGr, 640, 0);
  showText();
}

function showText(){
  /* なんか書くかも */
	text(names[typeId], 320, 640 * 0.85);
	text(namesEg[typeId], 320, 640 * 0.92);
}

function prepareConfig(){
	let gr = configGr;
	gr.background(160);
	gr.textSize(16);
	gr.textAlign(CENTER, CENTER);
	gr.noStroke();
	for(let k = 0; k < 16; k++){
		gr.fill(k * 8);
		gr.rect(0, k * 32, 160, 32);
	}
	gr.fill(255);
	for(let k = 0; k < 16; k++){
		gr.text(names[k], 80, 16 + 32 * k);
	}
}

// 画面外のボタンで切り替えできるといいかも知れない。(MANUAL/AUTO)
function keyTyped(){
  if(keyCode === 32){
    if(isLoop){ isLoop = false; noLoop(); }
    else{ isLoop = true; loop(); }
  }
}

// パターンの変更(modeIdの変更)
function mousePressed(){
	const x = mouseX - 640;
	const y = mouseY;
	if(x < 0 || x > 160 || y < 0 || y > 32 * 16){ return; }
	const newId = min(15, Math.floor(y / 32));
	if(typeId !== newId){
		typeId = newId;
	}
}

// カーソルが動くモーションくらいは作りたいわね（は？？）
// モード変更が確定したら30フレームくらいでそこに移動する、移動中はモード変更不可にする、移動はいつものsmoothで（x*x*(3-2*x)）。
// っておもったけどアウトバウンスやりたいなぁやったことないしバウンス
// 移動にマージンを設ければ負担が減ったりもするしいいこと。60フレームでもいいかなぁ。
