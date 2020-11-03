// FALさんのMorphのforkです→https://www.openprocessing.org/sketch/998058/
// p5ex使わないで書いてみました。

const CANVAS_SIZE = 480;
const HALF_SIZE = CANVAS_SIZE / 2;

const TIME_SCALE = 0.01;
let _time = 1024 * Math.random();
const tick = () => { _time += TIME_SCALE; }
let properFrameCount = 0;

const randomBetween = (a, b) => { return a + Math.random() * (b - a); }

const MORPHING_ACCELERATION = 0.25; // 大きいほど変化が速い。1に近づくほど速くなる。

let points = [];
const COUNT = 1000;

const diffuse = () => {
	for(let p of points){
		p.setTarget(randomBetween(-HALF_SIZE, HALF_SIZE), randomBetween(-HALF_SIZE, HALF_SIZE));
	}
};

const circle = () => {
  const radius = CANVAS_SIZE * 0.375;
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
    const angle = i * angleInterval;
		points[i].setTarget(radius * Math.cos(angle), radius * Math.sin(angle));
	}
};

const fan = () => {
  const radius = CANVAS_SIZE * 0.375;
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
    const angle = i * angleInterval;
    const factor = Math.sin(4 * angle);
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
};

const clover = () => {
  const radius = CANVAS_SIZE * 0.3;
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
    const angle = i * angleInterval;
    const factor = 0.5 * Math.abs(Math.sin(4 * angle)) + Math.abs(Math.cos(2 * angle));
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
};

const ribbon = () => {
  const radius = CANVAS_SIZE * 0.25;
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
    const angle = i * angleInterval;
    const factor = Math.sin(4 * angle) - Math.sin(3 * angle);
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
};

const cross_2 = () => {
  const radius = CANVAS_SIZE * 0.12;
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
    const angle = i * angleInterval;
    const factor = 2 + (i % 2 === 0 ? 1 : -1) * Math.sin(6 * angle);
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
};

const cross_3 = () => {
  const radius = CANVAS_SIZE * 0.3;
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
    const angle = i * angleInterval;
    const factor = 1 + 0.2 * Math.sin(6 * (angle + (i % 3) * Math.PI / 9));
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
};

const combo = () => {
  const angleInterval = (2 * Math.PI) / COUNT;
	for(let i = 0; i < COUNT; i++){
		const radius = CANVAS_SIZE * (i % 3 === 0 ? 0.3 : 0.12);
    const angle = i * angleInterval;
    const factor = (i % 3 === 0 ? Math.abs(Math.sin(angle * 3)) : 2 + (i % 3 === 1 ? 1 : -1) * Math.sin(angle * 6));
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
};

// 三角形ふたつ
const hexagram = () => {
	const angleInterval = (2 * Math.PI) / COUNT;
	const radius = CANVAS_SIZE * 0.24;
	for(let i = 0; i < COUNT; i++){
		const angle = i * angleInterval;
		let theta1 = angle - Math.floor(angle / (Math.PI * 2 / 3)) * Math.PI * 2 / 3;
		let theta2 = angle;
		if(theta2 > Math.PI * 5 / 3){ theta2 -= Math.PI * 4 / 3; }
		else if(theta2 > Math.PI){ theta2 -= Math.PI * 2 / 3; }
		else if(theta2 < Math.PI / 3){ theta2 += Math.PI * 2 / 3; }
		const factor1 = 1 / Math.cos(theta1 - Math.PI / 3);
		const factor2 = 1 / Math.cos(theta2 - Math.PI * 2 / 3);
		const factor = (i % 2 === 0 ? factor1 : factor2);
		points[i].setTarget(radius * Math.cos(angle) * factor, radius * Math.sin(angle) * factor);
	}
}

const PTN_ARRAY = [circle, fan, clover, ribbon, cross_2, cross_3, combo, hexagram, diffuse];
const SHAPE_COLOR_ARRAY = [[255, 0, 0, 16], [255, 127, 39, 16], [34, 177, 76, 16],
													 [255, 115, 160, 16], [0, 0, 255, 16], [163, 73, 164, 16], [153, 197, 22, 16], [165, 103, 69, 16], [64, 16]];

const PTN_SPAN = 60;
const PTN_NUM = PTN_ARRAY.length;
const TOTAL_SPAN = PTN_SPAN * PTN_NUM;

function setup(){
	createCanvas(CANVAS_SIZE, CANVAS_SIZE);
	frameRate(30);
	noStroke();
	for(let i = 0; i < COUNT; i++){
		points.push(new Point(i, randomBetween(-HALF_SIZE, HALF_SIZE), randomBetween(-HALF_SIZE, HALF_SIZE)));
	}
	background(255);
}

function draw(){
	translate(HALF_SIZE, HALF_SIZE);

	const PTN_INDEX = Math.floor((properFrameCount % TOTAL_SPAN) / PTN_SPAN);
	if(properFrameCount % PTN_SPAN === 0){ PTN_ARRAY[PTN_INDEX](); }

	tick();
	for(let p of points){ p.update(); }

	blendMode(ADD);
	background(255, 12);
	blendMode(BLEND);
	fill(...SHAPE_COLOR_ARRAY[PTN_INDEX]);
	for(let p of points){ p.draw(); }

	properFrameCount++;
}

class Point{
	constructor(index, x, y){
		this.index = index;
		this.x = x;
		this.y = y;
		this.targetX = x;
		this.targetY = y;
	}
	setTarget(tx, ty){
		this.targetX = tx;
		this.targetY = ty;
	}
	update(){
		this.x += MORPHING_ACCELERATION * (this.targetX - this.x);
		this.y += MORPHING_ACCELERATION * (this.targetY - this.y);
	}
	draw(){
		const r = 10;
		const theta = _time;
    const phi = 2 * PI * (this.index / COUNT);
    const nx = r * sin(theta) * cos(phi);
    const ny = r * sin(theta) * sin(phi);
    const nz = r * cos(theta);
    const size = 4 + 20 * noise(nx, ny, nz);
		ellipse(this.x, this.y, size, size);
	}
}

function keyTyped(){
	if(key === "p"){
		if(isLooping()){ noLoop(); }else{ loop(); }
	}
	if(key === "g"){
		save("morph" + properFrameCount.toString() + ".png");
	}
}
