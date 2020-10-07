// レールに乗って。
// ゲームのタイトルです。
// レールは障害物であり進むための指針でもあり
// 敵でもあり味方。そんなイメージで。

// いい感じですねー
// 消滅モーション作った。あとはパーティクル。

// railのメソッドで「record」を用意する。
// ようするにpreviousのもろもろ。これはすべてに共通なので、move内に書くのは具合が悪い。分離したい。
// まあ、move書くのがめんどくさいだけ。

// というわけでアクションゲームにするひとつのバリエーションを作ることにします
// 他の派生もありそうなのでとりあえず分けます

// まだテスト不十分だけどまあ手ごたえとしてはこんなもんでしょ・・
// いろいろ、lifeとか、動きについても手を付けてないし、んーーーーんーーーー
// とりあえず一区切り。

// ------------------------------------------------------------------------------------------------- //
// constants.

const AREA_WIDTH = 800;
const AREA_HEIGHT = 640;
const AREA_RADIUS = Math.sqrt(Math.pow(AREA_WIDTH, 2) + Math.pow(AREA_HEIGHT, 2)) * 0.5;

const RAIL_APPEAR_SPAN = 30;  // 出現モーション
const RAIL_VANISH_SPAN = 30; // 消滅モーション
const OBJECT_APPEAR_SPAN = 30; // 出現モーション
const OBJECT_VANISH_SPAN = 30; // 消滅モーション

// パーティクルは要相談って感じ
// 少なくともObjectが消えるときは出したいね
// aliveの他に、完全に消滅した後で消えるvanishってのを用意して、vanishがtrueになったときに
// 配列から外すようにするといいかも。

const OBJECT_UNRIDE_SPAN = 5; // レールに乗れないフレーム数を設けておく（同じレールに再び乗っちゃうのを防ぐ）

const PLAYER_RADIUS = 10; // オブジェクトの半径
const PLAYER_STROKEWEIGHT = 2; // オブジェクトの線の太さ
const RAIL_STROKEWEIGHT = 3; // レールの太さ

const PLAYER_MANUALACCELERATION = 0.15; // プレイヤーを操作するときの加速度
const GRAVITY_ACCELERATION = 0.2; // 重力加速度（鉛直下方）
const PLAYER_MANUALSPEED_LIMIT = 6; // マニュアルサイドのスピードの上限
const PLAYER_ACCELLSPEED_LIMIT = 8; // アクセルサイドのスピードの上限
const PLAYER_JUMPSPEED = 6; // ジャンプしたときの鉛直上方の速度。マイナスにして運用する。
const PLAYER_SPEEDDOWN_COEFFICIENT = 0.98; // 減速率。キー入力がない時に自然に減速する。
const PLAYER_SPEED_LOWERLIMIT = 0.01; // これより小さくなったら0とする。

const SIGN_HALFLENGTH = 6; // ポインターとかストッパーの長さの半分

// なんかconstでオブジェクト指定するとプロパティの方は変えられちゃうみたいだからこれでいいよ。
// 共通のメソッドで決める。staticで。

// railType.
const NORMAL_R = 0; // 通常レール
const FORCE_R = 1;  // 移動させられるレール（離脱可能）
const BIND_R = 2;   // 移動させられるレール（離脱不可）
const ACCELL_R = 3; // 加速度がかかるレール（離脱可能）
// 以下のレールは実装時はオーラをまとわせて分かりやすくする。
const ALL_KILL_R = 4;   // 通過すると即死のレール
const ONRAIL_KILL_R = 5;  // レールに乗ってない時通過できるが、レールに乗っているとき通過すると即死のレール
const OFFRAIL_KILL_R = 6; // レールに乗っていると通過できるが、レールに乗っていないとき通過すると即死のレール
const GOAL_R = 7; // ゴールライン。通過するとステージクリア。ライムがいいなーライムにしよ。
// 条件を満たすと現れるゴールライン、っていうのもいいね。仕事中に考えてた。

// ダメージレールのフラグ
const NONE_D = 0; // ダメージを受けない通常のレール。基本的に乗っかるもの。
const ALL_D = 1; // 即死(magenta)
const ONRAIL_D = 2; // レールに乗っているとき即死(red)
const OFFRAIL_D = 3; // レールに乗っていない時即死(blue)

// これ使う。だからメソッドは廃止で。
const RAIL_PALETTE = ["white", "skyblue", "lightgreen", "silver", "magenta", "red", "blue", "lime"];

const ONRAIL_PLAYER_COLOR = "dodgerblue"; // レールに乗ってるときのオブジェクトの色（青）
const OFFRAIL_PLAYER_COLOR = "tomato"; // レールに乗ってない時のオブジェクトの色（赤)
// 色が異なると即死、という流れ。そこ大事。いろいろ可視化しないと混乱する・・だから黄色は・・そう考えると紫かな。magentaにしよ。

// typeプロパティをやめて、reverseにする。reverseがtrueの場合は往復するが、そうでない場合は単純に1を足したり引いたりする。

// ------------------------------------------------------------------------------------------------- //
// main code.

let mySystem;

function setup(){
	createCanvas(AREA_WIDTH, AREA_HEIGHT);
	mySystem = new System();
}

function draw(){
	mySystem.update();
	mySystem.draw();
}

// railの作り方。
// ------paramについて。------
// まずstopperは長さ2の配列でtrue/falseが入ってる。BIND_Rのときはなるべく解放してください。trueにすると封じることができる。
// railTypeはNORMAL_R, FORCE_R, BIND_R, ACCELL_R, ALL_KILL_R, ONRAIL_KILL_R, OFFRAIL_KILL_R, GOAL_Rの8種類（今のところ）。
// NORMAL_Rの場合特別な付加構造は無し。FORCE_RとBIND_Rを指定する場合はpointerSpeedとpointerReverseを設定してね。
// ACCELL_Rの場合はacceleration(ベクトル)を設定する。ダメージレールはrailTypeだけでいい。おわり。
// ------それ以外の部分。------
// lineRailの作り方
// new LineRail(param, x1, y1, x2, y2, vx = 0, vy = 0);
// vx, vyは設定されてるとその方向に動くけど往復とかいろいろ、センサー、まあそこら辺はsetMoveでいくらでも。
// 生きてる間の動きに関してはproperFrameCountで自由に制御してねって感じ。
// new CircleRail(param, cx, cy, r, vx = 0, vy = 0);
// まあ、わかるでしょ。setMoveで動きを制御、といっても従来のような動かし方は多分もうしないけど
// new Arc(param, cx, cy, r, t, diff, vx = 0, vy = 0, angleSpeed = 0);
// これもなんとなくわかるはず。あとはもうsetMoveで何を指示するかかしらね・・・
// とりあえずsetMoveはいいです。
// あと、setLifeでlifeCountとsleepCountを設定する場合があります。lifeCountのデフォはInfinityですが有限にすると
// 一定時間で消滅します。sleepCountを設定すると元の場所に全く同じパラメータで復活します。
// backupのデータをいじれば違うデータを元に復活させることもできるけど・・そうなるともうオブジェクトプールだわね。

// ------------------------------------------------------------------------------------------------- //
// system.

class System{
	constructor(){
		this.rails = [];
		this.objects = [];
		this.trashRails = []; // sleepCountが正の場合はここに放り込む. updateを行い、sleepCountに達したら復活させる。
		this.trashObjects = []; // objectにもsleepCountを用意した方がいいかもとかそういうの
		this.bg = createGraphics(AREA_WIDTH, AREA_HEIGHT);
		this.prepareBackground();
		this.player = this.createPlayer();
		this.createRails();
		this.properFrameCount = 0;
	}
	prepareBackground(){
		let gr = this.bg;
		// 何でもいいから模様
		// この際チェックでいいよもう
		// スクロールであれしないようにするには若干大きめに取り、貼り付け方を工夫する。
		gr.noStroke();
		gr.translate(gr.width * 0.5, gr.height * 0.5);
		const GRID = 40;
		const LIMIT_X = Math.floor(gr.width * 0.5 / GRID) + 1;
		const LIMIT_Y = Math.floor(gr.height * 0.5 / GRID) + 1;
		for(let x = -LIMIT_X; x <= LIMIT_X; x++){
			for(let y = -LIMIT_Y; y <= LIMIT_Y; y++){
				gr.fill(((x + y + LIMIT_X * 2 + LIMIT_Y * 2) % 2) * 60);
				gr.square(x * GRID, y * GRID, GRID);
			}
		}
	}
	createRails(){
		// レールたち
		let _rail0 = new LineRail({railType:NORMAL_R}, 50, 400, 450, 400);
		this.rails.push(...[_rail0]);
	}
  createObjects(){
		// 他のオブジェクトを作るかもしれないとこ
	}
	createPlayer(){
		// プレイヤー
		let _player = new Player(100, 100);
		_player.setLife(Infinity, 30);
		this.objects.push(_player);
		return _player;
	}
	derailmentCheck(){
		// _objectについて所属している直線が消えた場合にそこをチェックする感じ。
		for(let _object of this.objects){
			const data = _object.belongingData;
			if(!data.isBelonging){ continue; }
			if(data.rail.isAlive()){ continue; }
			_object.derailment(); // derailment:脱線。これで。
		}
	}
	crossingCheck(){
		// 直線を横切る物体あったら乗っかる。
		for(let _object of this.objects){
			// 待ち状態のとき、visibleでないとき、レールに乗らないとき。
			if(_object.waitCount > 0 || !_object.isVisible() || _object.avoidRail){ continue; }
			for(let _rail of this.rails){
				// どれかに乗っかるならそこに乗っかる。あとは調べない。breakして次の物体に移る。
				// _objectのpositionとpreviousPositionを結ぶ線分が横切るかどうかで判定する。外積の積を取る。
				if(!_rail.isVisible()){ continue; }
				if(_object.isBelongingRail(_rail)){ continue; } // 所属中のレールの場合はスルー
				const proportion = _rail.getCrossing(_object);
				if(proportion < 0 || proportion > 1){ continue; }
        // このタイミングで交叉していることが確定するのでreactionしてsetRailするなりダメージするなりやる。
				_object.reaction(_rail, proportion);
				break;
			}
		}
	}
	trashCheck(){
		for(let index = this.trashRails.length - 1; index >= 0; index--){
			let _rail = this.trashRails[index];
			// sleepが終わったrailを元に戻す
			if(_rail.sleepCheck()){
				this.trashRails.splice(index, 1);
				_rail.reset();
				this.rails.push(_rail);
			}
		}
		for(let index = this.trashObjects.length - 1; index >= 0; index--){
			let _object = this.trashObjects[index];
			// sleepが終わったobjectを元に戻す
			if(_object.sleepCheck()){
				this.trashObjects.splice(index, 1);
				_object.reset();
				this.objects.push(_object);
			}
		}
	}
	remove(){
		// remove.
		// 線分が途中で消える場合、消えたフラグを立てたうえで、オブジェクトを外し、速度を補正し、そのあとで配列から排除する。
		// 修正。vanishしたところで排除する。
		// あー、確かに減っていくイテレータあったらこういうミス（++を--って書いちゃう）減るわね。便利かも。
		for(let index = this.rails.length - 1; index >= 0; index--){
			let _rail = this.rails[index];
		  if(_rail.isVanish()){
				this.rails.splice(index, 1);
				if(_rail.sleepCount > 0){
					// sleepさせるrailを回収する
					this.trashRails.push(_rail);
				}
			}
		}
		for(let index = this.objects.length - 1; index >= 0; index--){
			let _object = this.objects[index];
			if(_object.isVanish()){
				this.objects.splice(index, 1);
				if(_object.sleepCount > 0){
					// sleepさせるobjectを回収する（playerとか）
					this.trashObjects.push(_object);
				}
			}
		}
	}
	update(){
    // クリエイト部分は一旦なくす。
		for(let _rail of this.rails){ _rail.update(); }
		for(let _object of this.objects){ _object.update(); }
		this.crossingCheck();
		this.derailmentCheck();
		this.trashCheck();
    this.remove();
		this.properFrameCount++;
	}
	draw(){
		image(this.bg, 0, 0);
		noFill();
		// レールの描画
		strokeWeight(RAIL_STROKEWEIGHT);
		for(let _rail of this.rails){ _rail.draw(); }
		// オブジェクトの描画
		for(let _object of this.objects){ _object.draw(); }
	}
}

// ------------------------------------------------------------------------------------------------- //
// rail.

// 動くものと動かないもの
// 障害物と乗っかるレール
// まとめて扱いたい。
// さらに直線も円も・・もしくは円弧？ああ円弧でもいいわね。んー。となるとarcとcircleとlineと・・
// 同じ長さ（にした方が楽だろ）の線分のコンポジットとかあるいは正多角形とか面白いわね。
// で、それとは別に属性・・（乗っかってるときダメージ受けない、乗っかってないときダメージ受けない、強制的に加速するなど）があったり？
// 加速時にダメージ受けないとか。そういうのも面白そう。
// 基本的にはいくつかの点があってそれらが互いの長さとかの関係、もしくは順序とかを変化させないように動く。
// で、それに対してproportionから位置を計算する機構が備わっていてレールの上の点っていうのはそれに基づいて位置を変える。
// アクションゲームのリフトみたいな？
// で、移動に関してはmoveというクラスで制御・・するはず。オブジェクトでもいいか。undefinedの場合位置の更新はしない。

// 流れ。まずalive:trueのvisible:falseで始まってそのあとalive:trueとvisible:trueになってそのあとで
// 両方falseになってそれからvanishがtrueになって配列から排除。
class Rail{
  constructor(param){
		this.id = Rail.id++;
    // pointsやめて個別にする。
    this.move = undefined;
		this.length = 0;
		this.arrowPosition = createVector();

    // 以下のパラメータがsetAttributeでいじられる。ここではデフォを定義している。
		this.stopper = [false, false]; // 端っこで離脱させるか否か
		this.force = false; // 強制移動させるか否か
		this.pointer = undefined; // 強制移動させる場合のポインター
		this.bind = false; // 離脱できない場合trueになる
		this.acceleration = undefined; // 加速度が働くならそれをベクトルで表現する感じで。
		this.damageFlag = NONE_D; // ダメージレールの場合。敵は乗っかるのでプレイヤーだけ。黄色はアウト。

		this.setAttribute(param); // ここでもろもろのパラメータ、色などを決める感じ。
		// this.attribute = attribute; // 属性に応じて色が決まる感じ。
		// this.lineColor = RAIL_PALETTE[attribute];

		this.lifeCount = Infinity;
		this.sleepCount = 0;

		this.properFrameCount = 0;
    this.alive = true;
		this.visible = false;
		this.vanish = false;
		this.waitCount = 0;
  }
	setMove(_move){
		this.move = _move;
	}
	setAttribute(param){
		if(param.stopper !== undefined){
			this.stopper = [param.stopper[0], param.stopper[1]];
		}
		switch(param.railType){
			case NORMAL_R:
			  break;
			case FORCE_R:
			  this.force = true;
				this.pointer = new RailPointer(param.pointerSpeed, param.pointerReverse);
				break;
			case BIND_R:
			  this.force = true;
				this.bind = true;
				this.pointer = new RailPointer(param.pointerSpeed, param.pointerReverse);
			  break;
			case ACCELL_R:
			  this.acceleration = param.acceleration;
				this.accelePointingVector = p5.Vector.mult(this.acceleration, SIGN_HALFLENGTH * 2 / this.acceleration.mag());
				break;
			case ALL_KILL_R:
			  this.damageFlag = ALL_D;
				break;
			case ONRAIL_KILL_R:
			  this.damageFlag = ONRAIL_D;
				break;
			case OFFRAIL_KILL_R:
			  this.damageFlag = OFFRAIL_D;
				break;
		}
		this.lineColor = color(RAIL_PALETTE[param.railType]);
	}
	calcTangentFromProportion(proportion){
		// proportionに相当する位置の接線方向の単位ベクトルを取得して返す。
		// 向きも重要。向きはproportionの低い方から高い方。これを意識する場面が存在するので・・・・
		// ポインターの描画とかなら使わないけどね。
		const forward = Math.min((proportion * this.length + 1) / this.length, 1);
		const back = Math.max((proportion * this.length - 1) / this.length, 0);
		const forwardPoint = this.calcPositionFromProportion(forward);
		const backPoint = this.calcPositionFromProportion(back);
		return p5.Vector.sub(forwardPoint, backPoint).normalize();
	}
  isAlive(){
    return this.alive;
  }
	isVisible(){
		return this.visible;
	}
	isVanish(){
		return this.vanish;
	}
	appearCheck(){
		if(this.properFrameCount < RAIL_APPEAR_SPAN){
			this.properFrameCount++;
			if(this.properFrameCount === RAIL_APPEAR_SPAN){
				this.visible = true;
			  this.properFrameCount = 0;
			}
		}
	}
	vanishCheck(){
		if(this.properFrameCount < RAIL_VANISH_SPAN){
			this.properFrameCount++;
			if(this.properFrameCount === RAIL_VANISH_SPAN){
				this.vanish = true;
				this.properFrameCount = 0;
			}
		}
	}
	setLife(lifeCount, sleepCount = 0){
		this.lifeCount = lifeCount;
		this.sleepCount = sleepCount;
	}
	setLength(len){
		// ポインターに長さをセットするんだけど長さが決まってからじゃないといけなくてそこら辺。
		this.length = len;
		if(this.pointer !== undefined){
			this.pointer.setLength(len);
		}
	}
  sleepCheck(){
		this.properFrameCount++;
		return this.properFrameCount === this.sleepCount;
	}
	reset(){
		// sleepが終わったらリセット
		this.properFrameCount = 0;
		this.alive = true;
		this.visible = false;
		this.vanish = false;
		this.waitCount = 0;
		if(this.pointer !== undefined){ this.pointer.reset(); } // ポインターがあればリセット
		this.reconstruction(); // コンストラクタでやったようなことを実行するパート
	}
	reconstruction(){
		// コンストラクタの呼び直し
	}
  kill(){
    this.alive = false;
		this.visible = false;
		this.properFrameCount = 0;
  }
	calcPositionFromProportion(proportion){
		// 割合から点の位置を算出する処理はここで。
	}
	getCrossing(_object){
		// オブジェクトのそのときの位置とか前の位置とかからいろいろ計算して、交わってないなら-1,
		// 交わってるときはそのプロポーションを返すのね。点に対して計算。大きさは無視。0～1の値が返ってくるはずです・・！
	}
	calcArrowPosition(){
		// 矢印の表示位置の計算
	}
	record(){
		// previousを設定する処理
	}
	update(){
		// 多分moveとか動き関連。位置の変更はここで。
		if(!this.alive){ this.vanishCheck(); return; } // vanishするのはここで判定
		if(this.waitCount > 0){ this.waitCount--; }
		if(!this.visible){ this.appearCheck(); return; }
		this.record(); // previous関連
		if(this.acceleration !== undefined){ this.calcArrowPosition(); } // 矢印の位置の計算
		if(this.pointer !== undefined){ this.pointer.update(); } // ポインターがあればupdate.
		this.defaultMove(); // 基本ムーブ（速度に応じて動くとか）
		if(this.move !== undefined){ this.move(this); }
		this.properFrameCount++;
		if(this.properFrameCount > this.lifeCount){ this.kill(); }
	}
	drawVerticalSign(proportion){
		// ストッパーやポインターとしての縦線を描画するメソッド
		const p = this.calcPositionFromProportion(proportion);
		const normal = this.calcTangentFromProportion(proportion).mult(SIGN_HALFLENGTH);
    line(p.x - normal.y, p.y + normal.x, p.x + normal.y, p.y - normal.x);
	}
	drawStopper(){
		if(this.stopper[0]){ this.drawVerticalSign(0); }
		if(this.stopper[1]){ this.drawVerticalSign(1); }
	}
	drawPointer(){
		const pointerProportion = this.pointer.getProportion();
		this.drawVerticalSign(pointerProportion);
	}
	drawAccellArrow(){
		// 矢印の位置はレールごとに毎フレーム計算する、updateで。
		const p = this.arrowPosition;
		const v = this.accelePointingVector;
		line(p.x - v.x, p.y - v.y, p.x + v.x, p.y + v.y);
		line(p.x - v.y * 0.5, p.y + v.x * 0.5, p.x + v.x, p.y + v.y);
		line(p.x + v.y * 0.5, p.y - v.x * 0.5, p.x + v.x, p.y + v.y);
	}
	drawRail(){
		// 通常の描画処理。
	}
	drawAppearingRail(prg){
		// prgは操作してイージングをかけられる。0から1に増加していく。
	}
	drawVanishingRail(prg){
		// prgは操作してイージングをかけられる。1から0に減少していく。
	}
  draw(){
		// 図形の描画。
		stroke(this.lineColor); // ああここ文字列でいいのね・・初めて知った。

		if(this.visible){
			this.drawRail();
			// ストッパーとポインターはここで描く。現れるときや消えるときとかは要らない。
			if(this.stopper[0] | this.stopper[1]){ this.drawStopper(); }
			if(this.pointer !== undefined){ this.drawPointer(); }
			if(this.acceleration !== undefined){ this.drawAccellArrow(); }
			return;
		}
		if(!this.alive){
			const prgForVanish = this.properFrameCount / RAIL_VANISH_SPAN;
			this.drawVanishingRail(prgForVanish);
			return;
		}
		const prgForAppear = this.properFrameCount / RAIL_APPEAR_SPAN;
		this.drawAppearingRail(prgForAppear);
		return;
	}
}

Rail.id = 0;

// 線分レール
// 位置ベースで動かすことも考えて速度はとりあえず無しで。
// プロパティとしては用意しておくけど。ああ、じゃあundefinedにして使うかどうかオプションになるようにするか。
class LineRail extends Rail{
	constructor(param, x1, y1, x2, y2, vx = 0, vy = 0){
		super(param);
		this.backup = {x1:x1, y1:y1, x2:x2, y2:y2, vx:vx, vy:vy};
		this.reverse = true;
		this.p1 = createVector(x1, y1);
		this.p2 = createVector(x2, y2);
		this.previousP1 = this.p1.copy();
		this.previousP2 = this.p2.copy();
		this.velocity = createVector(vx, vy);
		this.setLength(dist(x1, y1, x2, y2));
	}
	reconstruction(){
		this.p1.set(this.backup.x1, this.backup.y1);
		this.p2.set(this.backup.x2, this.backup.y2);
		this.previousP1.set(this.p1);
		this.previousP2.set(this.p2);
		this.velocity.set(this.backup.vx, this.backup.vy);
	}
	calcPositionFromProportion(proportion){
		return p5.Vector.lerp(this.p1, this.p2, proportion);
	}
	getCrossing(_object){
		const {x:a, y:b} = this.p1;
		const {x:c, y:d} = this.p2;
		const {x:e, y:f} = this.previousP1;
		const {x:g, y:h} = this.previousP2;
		const {x:u, y:v} = _object.position;
		const {x:w, y:z} = _object.previousPosition;
		const flag_previous = ((u - a) * (d - b) > (v - b) * (c - a) ? 1 : -1);
		const flag_current = ((w - e) * (h - f) > (z - f) * (g - e) ? 1 : -1);
		let proportion = -1;
		if(flag_previous * flag_current < 0){
			const det = (c - a) * (v - z) - (u - w) * (d - b);
	    proportion = ((v - z) * (u - a) + (w - u) * (v - b)) / det;
		}
		return proportion; // 0より小さいか1より大きいときもダメにする。
	}
	record(){
		this.previousP1.set(this.p1);
		this.previousP2.set(this.p2);
	}
	defaultMove(){
		// 位置ベース移動の場合速度は常に0で、これは実行されるが意味をなさない。
		this.p1.add(this.velocity);
		this.p2.add(this.velocity);
	}
	calcArrowPosition(){
		this.arrowPosition.set((this.p1.x + this.p2.x) * 0.5, (this.p1.y + this.p2.y) * 0.5);
	}
	drawRail(){
		line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
	}
	drawAppearingRail(prg){
		prg = prg * prg * (3.0 - 2.0 * prg);
		line(this.p1.x, this.p1.y, this.p1.x + (this.p2.x - this.p1.x) * prg, this.p1.y + (this.p2.y - this.p1.y) * prg);
	}
	drawVanishingRail(prg){
		prg = prg * prg * (3.0 - 2.0 * prg);
		line(this.p1.x + (this.p2.x - this.p1.x) * prg, this.p1.y + (this.p2.y - this.p1.y) * prg, this.p2.x, this.p2.y);
	}
}

// 円形のレール
class CircleRail extends Rail{
  constructor(param, cx, cy, r, vx = 0, vy = 0){
		super(param);
		this.backup = {cx:cx, cy:cy, vx:vx, vy:vy};
		this.reverse = false;
		this.center = createVector(cx, cy);
		this.previousCenter = this.center.copy();
		this.velocity = createVector(vx, vy);
		this.radius = r;
		this.setLength(2 * Math.PI * r);
	}
	reconstruction(){
		this.center.set(this.backup.cx, this.backup.cy);
		this.previousCenter.set(this.center);
		this.velocity.set(this.backup.vx, this.backup.vy);
	}
	calcPositionFromProportion(proportion){
		const angle = proportion * 2 * Math.PI;
		return createVector(this.center.x + this.radius * Math.cos(angle), this.center.y + this.radius * Math.sin(angle));
	}
	getCrossing(_object){
		const flag_previous = (p5.Vector.dist(this.previousCenter, _object.previousPosition) > this.radius ? 1 : -1);
		const flag_current = (p5.Vector.dist(this.center, _object.position) > this.radius ? 1 : -1);
		let proportion = -1;
		if(flag_previous * flag_current < 0){
			// 線分と円弧の交点を求めるめんどくさい計算。
			const p = _object.position;
			const q = _object.previousPosition;
			const c = this.center;
			const e = this.previousCenter;
			const r = this.radius;
			const xi = p5.Vector.sub(c, p);
			const nu = p5.Vector.sub(p5.Vector.sub(p, q), p5.Vector.sub(c, e))
			const coeffA = nu.magSq();
			const coeffB = p5.Vector.dot(xi, nu);
			const coeffC = xi.magSq() - r * r;
			const coeffD = Math.sqrt(coeffB * coeffB - coeffA * coeffC);
			const l1 = (-coeffB + coeffD) / coeffA;
			const l2 = (-coeffB - coeffD) / coeffA;
			const l = (l1 > 0 && l1 < 1 ? l1 : l2);
			proportion = p5.Vector.sub(p5.Vector.lerp(p, q, l), c).heading() * 0.5 / Math.PI;
			if(proportion < 0){ proportion += 1; }
		}
		return proportion;
	}
	calcArrowPosition(){
		this.arrowPosition.set(this.center);
	}
	record(){
		this.previousCenter.set(this.center);
	}
	defaultMove(){
		this.center.add(this.velocity);
	}
	drawRail(){
		circle(this.center.x, this.center.y, this.radius * 2);
	}
	drawAppearingRail(prg){
		prg = prg * prg * (3.0 - 2.0 * prg);
		arc(this.center.x, this.center.y, this.radius * 2, this.radius * 2, 0, prg * 2 * Math.PI);
	}
	drawVanishingRail(prg){
		prg = prg * prg * (3.0 - 2.0 * prg);
		arc(this.center.x, this.center.y, this.radius * 2, this.radius * 2, prg * 2 * Math.PI, 2 * Math.PI);
	}
}

// ある角度に対して0～2*PI未満、を与えてその範囲で動かす感じ。
// 算出した角度を2PIの足し引きで定めた範囲に落として・・そのうえで交わるかどうか判断する感じね。
// たとえばtからt+PIだったら・・
// proportionの算出計算で0～2PIが出るんだけど、t～t+Aでtが増加したり減少したりっていうのを考えた時に・・いや、いいや、
// 常にt～t+Aみたいな感じで考える、で、0～2PIに落としてから・・
// 内積使った方が楽だと思う。lerpで点出したら中心からのベクトル取って正規化して、弧の真ん中に向かう単位ベクトルと内積して、
// そうするとcosの値が出るからそれがある値以上なら弧の上って出るからそれ使った方が明らかに楽。あとは・・
// headingで出した角度をt～t+Aに落とした方が簡単そう・・t～t+2PIに落として。そうすればproportionもすぐ出るし判定も一瞬。それで行こう。
class ArcRail extends Rail{
	constructor(param, cx, cy, r, t, diff, vx = 0, vy = 0, angleSpeed = 0){
		super(param);
		this.backup = {cx:cx, cy:cy, vx:vx, vy:vy, t1:t, t2:(t + diff), angleSpeed:angleSpeed};
		this.reverse = true;
		this.center = createVector(cx, cy);
		this.previousCenter = this.center.copy();
		this.velocity = createVector(vx, vy);
		this.radius = r;
		this.setLength(2 * diff * r);
		this.t1 = t;
		this.t2 = t + diff;
		this.angleSpeed = angleSpeed;
	}
	reconstruction(){
		this.center.set(this.backup.cx, this.backup.cy);
		this.previousCenter.set(this.center);
		this.velocity.set(this.backup.vx, this.backup.vy);
		this.t1 = this.backup.t1;
		this.t2 = this.backup.t2;
		this.angleSpeed = this.backup.angleSpeed;
	}
	calcPositionFromProportion(proportion){
		let angle = this.t1 + proportion * (this.t2 - this.t1);
		return createVector(this.center.x + this.radius * Math.cos(angle), this.center.y + this.radius * Math.sin(angle));
	}
	getCrossing(_object){
		// 冗長なのはわかってるんだよ・・
		const flag_previous = (p5.Vector.dist(this.previousCenter, _object.previousPosition) > this.radius ? 1 : -1);
		const flag_current = (p5.Vector.dist(this.center, _object.position) > this.radius ? 1 : -1);
		let proportion = -1;
		if(flag_previous * flag_current < 0){
			// 線分と円弧の交点を求めるめんどくさい計算。
			const p = _object.position;
			const q = _object.previousPosition;
			const c = this.center;
			const e = this.previousCenter;
			const r = this.radius;
			const xi = p5.Vector.sub(c, p);
			const nu = p5.Vector.sub(p5.Vector.sub(p, q), p5.Vector.sub(c, e))
			const coeffA = nu.magSq();
			const coeffB = p5.Vector.dot(xi, nu);
			const coeffC = xi.magSq() - r * r;
			const coeffD = Math.sqrt(coeffB * coeffB - coeffA * coeffC);
			const l1 = (-coeffB + coeffD) / coeffA;
			const l2 = (-coeffB - coeffD) / coeffA;
			const l = (l1 > 0 && l1 < 1 ? l1 : l2);
			let direction = p5.Vector.sub(p5.Vector.lerp(p, q, l), c).heading(); // -Math.PI～Math.PIです。
			// t～t+2PIに落とす。
			if(direction < this.t1){ direction += 2 * Math.PI * (Math.floor((this.t1 - direction) * 0.5 / Math.PI) + 1); }
			if(direction > this.t1 + 2 * Math.PI){ direction -= 2 * Math.PI * (Math.floor((direction - this.t1 - 2 * Math.PI) * 0.5 / Math.PI) + 1); }
			proportion = (direction - this.t1) / (this.t2 - this.t1);
		}
		return proportion;
	}
	calcArrowPosition(){
		const t = (this.t1 + this.t2) * 0.5;
		this.arrowPosition.set(this.center.x + Math.cos(t) * this.radius, this.center.y + Math.sin(t) * this.radius);
	}
	record(){
		this.previousCenter.set(this.center);
	}
	defaultMove(){
		this.center.add(this.velocity);
		this.t1 += this.angleSpeed;
		this.t2 += this.angleSpeed;
	}
	drawRail(){
		arc(this.center.x, this.center.y, this.radius * 2, this.radius * 2, this.t1, this.t2);
	}
	drawAppearingRail(prg){
		prg = prg * prg * (3.0 - 2.0 * prg);
		arc(this.center.x, this.center.y, this.radius * 2, this.radius * 2, this.t1, this.t1 + (this.t2 - this.t1) * prg);
	}
	drawVanishingRail(prg){
		prg = prg * prg * (3.0 - 2.0 * prg);
		arc(this.center.x, this.center.y, this.radius * 2, this.radius * 2, this.t1 + (this.t2 - this.t1) * prg, this.t2);
	}
}

// オブジェクトを強制移動させる場合のポインタークラス。勝手にupdateしてくれるので便利。
class RailPointer{
	constructor(speed, reverseFlag){
		this.speed = speed;
		this.reverseFlag = reverseFlag;
		this.proportion = 0;
	}
	setLength(len){
		this.railLength = len;
	}
	reset(){
		this.proportion = 0;
	}
	getProportion(){
		return this.proportion;
	}
	update(){
		this.proportion = (this.proportion * this.railLength + this.speed) / this.railLength;
		if(this.proportion < 0 || this.proportion > 1){
			if(this.reverseFlag){
				// リバースの場合ははしっこで向きを変える
				this.proportion = constrain(this.proportion, 0, 1);
				this.speed *= -1;
			}else{
				// そうでなければ反対側にワープ
				if(this.proportion < 0){ this.proportion += 1; }else{ this.proportion -= 1; }
			}
		}
	}
}

// ------------------------------------------------------------------------------------------------- //
// Moving object.

// これをどうするかっていう。
// updateとdraw.
// プレイヤーのupdate:レールの種類に応じた処理, draw:今まで通り、とりあえず。
// drawはグラフィックの貼り付けの方が処理も軽いしそうなるかも。
// 敵のupdateとかdraw・・そもそもレールに乗らないかもしれないっていうね。
// 現在「画面外に出たら消える」ってやってるところはそのうちなくす。
// まあ、あった方がいいか（事故を防ぐために）。
// 結局、レールと一緒でmoveだけ分離した方がすっきりするかな・・
class MovingObject{
	constructor(x, y){
		this.position = createVector(x, y);
		this.previousPosition = this.position.copy();
		this.belongingData = {isBelonging:false, rail:undefined, proportion:undefined, sign:0};

		this.properFrameCount = 0; // 図形が回転するならそういうのをとかなんかそんなの
		this.alive = true;
		this.visible = false; // 出現するまでは直線と交わっても乗っからないとかそういうの。
		this.waitCount = 0;
		this.vanish = false;

		this.lifeCount = Infinity;
		this.sleepCount = 0;

    // 個性に関するデータ。この辺がプレーヤーと敵で大きく分かれそう。
		this.manualVelocity = createVector(0, 0);
		this.accellVelocity = createVector(0, 0);

		this.avoidRail = false; // trueだとレールを避ける. 継承の方で何とかする。
	}
	setLife(lifeCount, sleepCount = 0){
		this.lifeCount = lifeCount;
		this.sleepCount = sleepCount;
	}
	reset(){
		this.belongingData = {isBelonging:false, rail:undefined, proportion:undefined, sign:0};
		this.properFrameCount = 0;
		this.alive = true;
		this.visible = false;
		this.waitCount = 0;
		this.vanish = false;
		this.manualVelocity.set(0, 0);
		this.accellVelocity.set(0, 0);
		this.reconstruction();
	}
	reconstruction(){
		// 個別の復活メソッド
	}
	isAlive(){
		return this.alive;
	}
	isVisible(){
		return this.visible;
	}
	isVanish(){
		return this.vanish;
	}
	isBelongingRail(_rail){
		// 所属している直線ならtrueを返す。
		if(!this.belongingData.isBelonging){ return false; }
		return this.belongingData.rail.id === _rail.id;
	}
	kill(){
		this.alive = false;
		this.visible = false;
		this.properFrameCount = 0;
	}
  reaction(_rail, proportion){
		// レールに接する場合の処理は個別にしましょうね。
  }
	setRail(_rail, proportion){
		// これはreactionからの分岐でsetRailってしないとダメージレールの処理が書けない・・
		this.accellVelocity.set(0, 0); // アクセルサイドの速度をリセット
		let data = this.belongingData;
		data.isBelonging = true;
		data.rail = _rail;
	  data.proportion = proportion;
		data.sign = random([-1, 1]);
		this.waitCount = OBJECT_UNRIDE_SPAN;
	}
	derailment(){
		// レールから離脱する。
		// 速度はそのまま。
		//const direction = p5.Vector.sub(this.position, this.previousPosition).heading();
		//this.velocity.set(p5.Vector.fromAngle(direction, this.speed));
		this.belongingData.isBelonging = false;
		this.belongingData.rail = undefined;
		this.belongingData.proportion = undefined;
		this.belongingData.sign = 0;
		// 離脱した後のスパンは必要ないでしょ。
	}
	appearCheck(){
		if(this.properFrameCount < OBJECT_APPEAR_SPAN){
			this.properFrameCount++;
			if(this.properFrameCount === OBJECT_APPEAR_SPAN){
				this.visible = true;
				this.properFrameCount = 0;
			}
		}
	}
	vanishCheck(){
		if(this.properFrameCount < OBJECT_VANISH_SPAN){
			this.properFrameCount++;
			if(this.properFrameCount === OBJECT_VANISH_SPAN){
				this.vanish = true;
				this.properFrameCount = 0;
			}
		}
	}
	sleepCheck(){
		this.properFrameCount++;
		return this.properFrameCount === this.sleepCount;
	}
	onRailMove(){
		// レールに乗ってるときの速度補正処理
	}
	offRailMove(){
		// レールに乗ってない時の速度補正処理
	}
	updatePosition(){
		// 速度に従って最終的に位置を決める処理
	}
	boundaryCheck(){
		if(this.position.x < 0 || this.position.x > AREA_WIDTH){ this.kill(); }
		if(this.position.y < 0 || this.position.y > AREA_HEIGHT){ this.kill(); }
	}
	update(){
		if(!this.alive){ this.vanishCheck(); return; }
		if(this.waitCount > 0){ this.waitCount--; }

		// appearするかどうかチェック。その間properFrameCountは変化なし。
		if(!this.visible){ this.appearCheck(); return; }

		this.previousPosition.set(this.position.x, this.position.y);
		if(this.belongingData.isBelonging){
			// 所属する直線がある場合の処理。具体的には直線がスピードを指定するのでそれに従って直線に沿って動く。
			this.onRailMove();
		}else{
			// ない場合は普通に速度を足す。
			this.offRailMove();
		}
		this.updatePosition(); // 速度の補正や位置の決定を行う。
		this.boundaryCheck();
		this.properFrameCount++;
  }
	draw(){}
}

// 何が何でも完成させる
// Playerはレールの特性に影響を受ける。ダメージレールに乗れなかったり。
// bindのレールから離脱ボタンで離脱できないようにいじるのは適宜メソッドを用意するので・・待っててね。

// sleepCountを用意するとか。セーブポイントを用意してそこから再開する・・・
class Player extends MovingObject{
	constructor(x, y){
		super(x, y);
		this.backup = {x:x, y:y};
		// この2つはPlayer用でそのうち移す
	  this.radius = PLAYER_RADIUS;
		this.jumpFlag = false; // ジャンプ
		this.derailFlag = false; // 自然な離脱
	}
	reconstruction(){
		this.position.set(this.backup.x, this.backup.y);
		this.previousPosition.set(this.position);
	}
	reaction(_rail, proportion){
		// ダメージかどうかで分ける。
		// 乗った後は知らない。
		switch(_rail.damageFlag){
			case NONE_D:
			  this.setRail(_rail, proportion); break;
			case ALL_D:
			  this.kill(); break;
			case ONRAIL_D:
			  if(this.belongingData.isBelonging){ this.kill(); } break;
			case OFFRAIL_D:
			  if(!this.belongingData.isBelonging){ this.kill(); } break;
		}
	}
	setDerailFlag(){
		// キー入力で使う（シフト）
		const data = this.belongingData;
		if(!data.isBelonging){ return; }
		if(data.rail.bind){ return; }
		this.derailFlag = true;
		this.waitCount = OBJECT_UNRIDE_SPAN;
	}
	setJumpFlag(){
		// キー入力で使う（スペース）
		const data = this.belongingData;
		if(!data.isBelonging){ return; }
		if(data.rail.bind){ return; }
		this.jumpFlag = true;
		this.waitCount = OBJECT_UNRIDE_SPAN;
	}
	getArrowKeyInput(){
		const x = (keyIsDown(RIGHT_ARROW) ? 1 : (keyIsDown(LEFT_ARROW) ? -1 : 0));
		const y = (keyIsDown(DOWN_ARROW) ? 1 : (keyIsDown(UP_ARROW) ? -1 : 0));
		return {x, y};
	}
	controlManualVelocity(inputX, inputY){
		if(inputX){
			this.manualVelocity.x += inputX * PLAYER_MANUALACCELERATION;
		}else{
			this.manualVelocity.mult(PLAYER_SPEEDDOWN_COEFFICIENT);
		}
		if(inputY){
			this.manualVelocity.y += inputY * PLAYER_MANUALACCELERATION;
		}else{
			this.manualVelocity.mult(PLAYER_SPEEDDOWN_COEFFICIENT);
		}
		if(this.manualVelocity.mag() > 0.0 && this.manualVelocity.mag() < PLAYER_SPEED_LOWERLIMIT){
			this.manualVelocity.set(0, 0);
		}
	}
	proportionAdjustment(){
		let data = this.belongingData;
		const _rail = data.rail;
		if(_rail.reverse){
			// 弧とか線分
			if(data.proportion < 0){
				if(_rail.stopper[0]){
					data.proportion = 0;
					this.manualVelocity.set(0, 0); // はじっこで止まる場合
					this.accellVelocity.set(0, 0); // どっちも0にする
				}else{
					this.derailment(); // 外れる
				}
			}
			if(data.proportion > 1){
				if(_rail.stopper[1]){
					data.proportion = 1;
					this.manualVelocity.set(0, 0); // はじっこで止まる場合
					this.accellVelocity.set(0, 0); // どっちも0にする
				}else{
					this.derailment(); // 外れる
				}
			}
		}else{
			// 円とか
			if(data.proportion < 0){ data.proportion += 1; }
			if(data.proportion > 1){ data.proportion -= 1; }
		}
	}
	velocityAdjustment(){
		const mMag = this.manualVelocity.mag();
		const aMag = this.accellVelocity.mag();
		if(mMag > PLAYER_MANUALSPEED_LIMIT){ this.manualVelocity.mult(PLAYER_MANUALSPEED_LIMIT / mMag); }
		if(aMag > PLAYER_ACCELLSPEED_LIMIT){ this.accellVelocity.mult(PLAYER_ACCELLSPEED_LIMIT / aMag); }
	}
	jump(){
		// ジャンプしてレールを離脱する（onRail→offRailのパターンしかない、常にレールに乗っているので）。
		// railがbindの場合は不可能。bindのレールからは端っこからしか離脱できない。
		this.derailment();
		this.accellVelocity.set(0, -PLAYER_JUMPSPEED);
	}
	onRailMove(){
    // forceとかpointerとかgravityとかstopperに従って更新。
		// 速度はいじるけど位置更新はプロポーション使って別立てでやるかな・・
		// ちなみにこの処理の中ではじっこから飛び出してoffRailになる場合があって、その場合は速度をいじらないので、
		// その速度のままoffRailであるものとして位置を更新する。そうするしかないでしょう。

    // ジャンプや離脱の命令が出ている場合はそのように処理して終わり
		if(this.jumpFlag){ this.jump(); this.jumpFlag = false; return; }
		if(this.derailFlag){ this.derailment(); this.derailFlag = false; return; }

    let data = this.belongingData;
		const _rail = data.rail;
		const tangent = _rail.calcTangentFromProportion(data.proportion); // 接線単位ベクトル。何かと使うので。
		if(_rail.force){
			const pointer = _rail.pointer;
			const stopper = _rail.stopper;
			// 強制移動の場合はmanualSpeedをtangentで更新しつつ・・って感じ。tangentはproportionの低い方から高い方。
			this.manualVelocity.set(p5.Vector.mult(tangent, pointer.speed));
			data.proportion = (data.proportion * _rail.length + pointer.speed) / _rail.length;
		}else{
			// キー入力による変更
			// manualSpeedとaccellSpeedにバリデーションを適用するか。それでいける？
			const arrowKeyInput = this.getArrowKeyInput();
			this.controlManualVelocity(arrowKeyInput.x, arrowKeyInput.y);
			let manualSpeed = 0;
			let accellSpeed = 0;
			manualSpeed = Math.min(p5.Vector.dot(this.manualVelocity, tangent), PLAYER_MANUALSPEED_LIMIT);
			this.manualVelocity.set(p5.Vector.mult(tangent, manualSpeed)); // 射影を取る
			// 加速度の影響がある場合の処理
			if(_rail.acceleration !== undefined){
				this.accellVelocity.add(_rail.acceleration);
				accellSpeed = Math.min(p5.Vector.dot(this.accellVelocity, tangent), PLAYER_ACCELLSPEED_LIMIT);
				this.accellVelocity.set(p5.Vector.mult(tangent, accellSpeed)); // 射影を取る
			}
			// 符号付の速さでないと失敗する。tangent方向が基準。tangentはproportionの増加方向に流れてるので、
			// 内積を取ればproportionをどっちに増やせばいいか分かる仕組み。
			data.proportion = (data.proportion * _rail.length + manualSpeed + accellSpeed) / _rail.length;
		}
		// proportionの補正はこの辺で行なうのがいいのでは。
		this.proportionAdjustment();
		// 速度についてのバリデーションはかけない。中でやってるから。
	}
	offRailMove(){
		// 上下の入力は無視される。自由に動くが鉛直下方の重力に支配される。
		const arrowKeyInput = this.getArrowKeyInput(); // {x:0か1か-1, y:0か1か-1} xが水平でyが垂直。
		// y成分は強制的に無視する。つまり減速して0になる。
		this.controlManualVelocity(arrowKeyInput.x, 0);
		this.accellVelocity.y += GRAVITY_ACCELERATION;
		this.velocityAdjustment();
	}
	updatePosition(){
		// 位置・・レールに乗ってるならプロポーション使ってサクッと
		// 乗ってないなら速度に従ってね
		const {isBelonging, proportion, rail} = this.belongingData;
		if(isBelonging){
			this.position.set(rail.calcPositionFromProportion(proportion));
		}else{
			this.position.add(this.manualVelocity);
			this.position.add(this.accellVelocity);
		}
	}
	draw(){
    // drawObject, drawAppearingObject, drawVanishingObjectに分けた方がいいかも。
    // Appearingは敵だったらパーティクルが集まってから半径大きくしてどん！みたいな。他にもellipseで横や縦に広げるとか変化を持たせたい。
    // Vanishingも。今使ってるのはPlayer用で・・
		// 普通にプレイヤーの色にした。最終的にはグラフィック。
		if(this.belongingData.isBelonging){
			stroke(ONRAIL_PLAYER_COLOR);
		}else{
			stroke(OFFRAIL_PLAYER_COLOR);
		}
		strokeWeight(PLAYER_STROKEWEIGHT);
		if(this.visible){
			circle(this.position.x, this.position.y, this.radius * 2);
			return;
		}
		if(!this.alive){
			let prgForVanish = this.properFrameCount / OBJECT_VANISH_SPAN;
			// ここは工夫したいわね（パーティクル出すとか）
			// ラスト1フレームで出すとかなら別の所に書かなくて済むし・・ああいやSystemの方に書くべきよね。
			prgForVanish = prgForVanish * prgForVanish;
			circle(this.position.x, this.position.y, this.radius * 2 * (1.0 - prgForVanish));
			return;
		}
		let prgForAppear = this.properFrameCount / OBJECT_APPEAR_SPAN;
		// ここprgイージングさせてもいいかも
		circle(this.position.x, this.position.y, this.radius * 2 * prgForAppear);
	}
}

// Enemyはストッパー以外は任意、完全に自由に動く。場合によってはホップする。空中では重力に従うけどレールに乗ったら
// また普通に動く、画面外に出たら消える。そこはいろいろ、時間で消えたり・・とにかく、ストッパーだけ。
// 円環ならずっとぐるぐるしてる。ダメージレールにも普通に乗れる。
// やっぱポインターにも従って欲しいかも。動きが作りやすい。
class Enemy extends MovingObject{
	constructor(){}
}

// ------------------------------------------------------------------------------------------------- //
// interaction.

// キー入力。
function keyPressed(){
	if(keyCode === 32){
		// スペースキーでジャンプ
		mySystem.player.setJumpFlag();
	}
	if(keyCode === SHIFT){
		// シフトキー、keyTypedだと使えないのにkeyPressedだと使えるの謎。
		mySystem.player.setDerailFlag();
	}
}
