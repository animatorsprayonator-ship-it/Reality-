const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET;
if (!SECRET && process.env.NODE_ENV === "production") {
  console.error("Set JWT_SECRET in your hosting environment.");
  process.exit(1);
}
const JWT_SECRET = SECRET || "dev-only-change-this-secret";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = path.join(DATA_DIR, "pixelverse.json");

const freshDB = () => ({
  users: {}, worlds: {}, friendships: {}, requests: {}, auctions: {}, trades: {},
  daily: { date: new Date().toISOString().slice(0,10), deals: [] }
});
let db = freshDB();
try { if (fs.existsSync(DB_FILE)) db = {...freshDB(), ...JSON.parse(fs.readFileSync(DB_FILE,"utf8"))}; } catch(e) { console.error("DB load:", e.message); }
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 80);
}
app.use(express.json({limit:"64kb"}));
app.use(express.static(path.join(__dirname, "public")));

const dimensions = {
  plains: { unlock: 0, blocks: [{id:"dirt",name:"Dirt",hp:2,coins:2,xp:1},{id:"stone",name:"Stone",hp:5,coins:5,xp:2},{id:"iron",name:"Iron Ore",hp:10,coins:12,xp:4},{id:"gold",name:"Gold Ore",hp:18,coins:25,xp:7},{id:"diamond",name:"Diamond",hp:32,coins:60,xp:15}] },
  hell: { unlock: 5000, blocks: [{id:"ash",name:"Ash",hp:12,coins:15,xp:5},{id:"magma",name:"Magma Rock",hp:25,coins:35,xp:10},{id:"ruby",name:"Ruby",hp:45,coins:80,xp:18},{id:"inferno",name:"Inferno Crystal",hp:75,coins:150,xp:30}] },
  space: { unlock: 50000, blocks: [{id:"moonstone",name:"Moonstone",hp:40,coins:65,xp:15},{id:"meteor",name:"Meteorite",hp:70,coins:120,xp:25},{id:"plasma",name:"Plasma Ore",hp:110,coins:220,xp:45},{id:"cosmic",name:"Cosmic Core",hp:180,coins:500,xp:90}] }
};
const bosses = {
  plains: [{id:"stone-golem",name:"Stone Golem",hp:500,reward:500},{id:"forest-king",name:"Forest King",hp:1200,reward:1200},{id:"diamond-titan",name:"Diamond Titan",hp:3000,reward:3000}],
  hell: [{id:"magma-beast",name:"Magma Beast",hp:5000,reward:6000},{id:"demon-lord",name:"Demon Lord",hp:9000,reward:10000},{id:"inferno-king",name:"Inferno King",hp:16000,reward:18000}],
  space: [{id:"moon-destroyer",name:"Moon Destroyer",hp:25000,reward:30000},{id:"alien-overlord",name:"Alien Overlord",hp:40000,reward:50000},{id:"cosmic-emperor",name:"Cosmic Emperor",hp:75000,reward:100000}]
};
const catalog = [
  {id:"wood-pick",name:"Wood Pickaxe",type:"pickaxe",price:0,power:2,rarity:"Common"},
  {id:"iron-pick",name:"Iron Pickaxe",type:"pickaxe",price:250,power:5,rarity:"Uncommon"},
  {id:"gold-pick",name:"Gold Pickaxe",type:"pickaxe",price:1500,power:12,rarity:"Rare"},
  {id:"diamond-pick",name:"Diamond Drill",type:"pickaxe",price:8000,power:30,rarity:"Epic"},
  {id:"plasma-drill",name:"Plasma Drill",type:"pickaxe",price:50000,power:100,rarity:"Mythic"},
  {id:"iron-sword",name:"Iron Sword",type:"sword",price:300,damage:10,rarity:"Uncommon"},
  {id:"diamond-sword",name:"Diamond Sword",type:"sword",price:2500,damage:35,rarity:"Rare"},
  {id:"fire-sword",name:"Fire Sword",type:"sword",price:9000,damage:80,rarity:"Epic"},
  {id:"demon-axe",name:"Demon Axe",type:"sword",price:25000,damage:180,rarity:"Legendary"},
  {id:"plasma-sword",name:"Plasma Sword",type:"sword",price:70000,damage:350,rarity:"Mythic"},
  {id:"alien-blaster",name:"Alien Blaster",type:"sword",price:150000,damage:800,rarity:"Divine"},
  {id:"cosmic-blade",name:"Cosmic Blade",type:"sword",price:300000,damage:1500,rarity:"Cosmic"},
  {id:"leather-armor",name:"Leather Armor",type:"armor",price:200,hp:25,rarity:"Common"},
  {id:"gold-armor",name:"Gold Armor",type:"armor",price:1500,hp:80,rarity:"Rare"},
  {id:"diamond-armor",name:"Diamond Armor",type:"armor",price:8000,hp:180,rarity:"Epic"},
  {id:"hellfire-armor",name:"Hellfire Armor",type:"armor",price:40000,hp:400,rarity:"Legendary"},
  {id:"alien-armor",name:"Alien Armor",type:"armor",price:120000,hp:800,rarity:"Divine"},
  {id:"cosmic-armor",name:"Cosmic Armor",type:"armor",price:250000,hp:1500,rarity:"Cosmic"},
  {id:"small-pack",name:"Small Backpack (+25)",type:"backpack",price:500,slots:25,rarity:"Uncommon"},
  {id:"iron-pack",name:"Iron Backpack (+50)",type:"backpack",price:1800,slots:50,rarity:"Rare"},
  {id:"gold-pack",name:"Golden Backpack (+100)",type:"backpack",price:7000,slots:100,rarity:"Epic"},
  {id:"demon-pack",name:"Demon Backpack (+200)",type:"backpack",price:30000,slots:200,rarity:"Legendary"},
  {id:"cosmic-pack",name:"Cosmic Backpack (+500)",type:"backpack",price:150000,slots:500,rarity:"Cosmic"},
  {id:"boost-mining",name:"Permanent Mining Speed +10%",type:"boost",price:5000,boost:"mining",rarity:"Epic"},
  {id:"boost-luck",name:"Permanent Luck +5%",type:"boost",price:8000,boost:"luck",rarity:"Legendary"},
  {id:"boost-coins",name:"Permanent Coin Gain +10%",type:"boost",price:10000,boost:"coins",rarity:"Legendary"},
  {id:"boost-xp",name:"Permanent XP Gain +10%",type:"boost",price:10000,boost:"xp",rarity:"Legendary"}
];
const regions = ["Asia","Europe","North America","South America","Oceania","Africa"];
function newUser(username, hash) {
  return { username, hash, coins:100, level:1, xp:0, inventory:{}, capacity:50, owned:["wood-pick"], equipped:{pickaxe:"wood-pick",sword:null,armor:null}, unlocked:["plains"], boosts:{}, createdAt:Date.now() };
}
function tokenFor(id) { return jwt.sign({id}, JWT_SECRET, {expiresIn:"30d"}); }
function auth(req,res,next) {
  const h = req.headers.authorization || "";
  try { const payload = jwt.verify(h.replace(/^Bearer /,""), JWT_SECRET); req.user = db.users[payload.id]; req.uid=payload.id; if(!req.user) throw Error(); next(); }
  catch { res.status(401).json({error:"Please sign in again."}); }
}
function cleanUser(u) { return {username:u.username,coins:u.coins,level:u.level,xp:u.xp,inventory:u.inventory,capacity:u.capacity,owned:u.owned,equipped:u.equipped,unlocked:u.unlocked,boosts:u.boosts}; }
function worldKey(region,dim) { return `${region}:${dim}`; }
function world(region,dim) {
  const key=worldKey(region,dim);
  if(!db.worlds[key]) db.worlds[key]={blocks:{},players:{},bosses:{}};
  return db.worlds[key];
}
function getBoss(region,dim,id) {
  const def=(bosses[dim]||[]).find(b=>b.id===id); if(!def) return null;
  const w=world(region,dim);
  if(!w.bosses[id] || w.bosses[id].defeated) w.bosses[id]={hp:def.hp,maxHp:def.hp,defeated:false};
  return {def,state:w.bosses[id]};
}
function item(id) { return catalog.find(x=>x.id===id); }
function addXP(u,amount) { u.xp += amount; while(u.xp >= u.level*100){u.xp-=u.level*100;u.level++;} }
function countItems(inv) { return Object.values(inv).reduce((a,b)=>a+b,0); }

app.post("/api/register", async (req,res)=>{
  const username=String(req.body.username||"").trim();
  const password=String(req.body.password||"");
  if(!/^[A-Za-z0-9_]{3,16}$/.test(username)) return res.status(400).json({error:"Username must be 3–16 letters, numbers or underscores."});
  if(password.length<8) return res.status(400).json({error:"Password must be at least 8 characters."});
  if(Object.values(db.users).some(u=>u.username.toLowerCase()===username.toLowerCase())) return res.status(409).json({error:"That permanent username is already taken."});
  const id=require("crypto").randomUUID(), hash=await bcrypt.hash(password,12);
  db.users[id]=newUser(username,hash); save(); res.json({token:tokenFor(id),user:cleanUser(db.users[id])});
});
app.post("/api/login", async (req,res)=>{
  const username=String(req.body.username||"").trim(), password=String(req.body.password||"");
  const entry=Object.entries(db.users).find(([,u])=>u.username.toLowerCase()===username.toLowerCase());
  if(!entry || !(await bcrypt.compare(password,entry[1].hash))) return res.status(401).json({error:"Incorrect username or password."});
  res.json({token:tokenFor(entry[0]),user:cleanUser(entry[1])});
});
app.get("/api/me",auth,(req,res)=>res.json({user:cleanUser(req.user),catalog,dimensions,bosses,regions}));
app.post("/api/unlock",auth,(req,res)=>{
  const dim=req.body.dimension, def=dimensions[dim];
  if(!def) return res.status(400).json({error:"Unknown dimension."});
  if(req.user.unlocked.includes(dim)) return res.json({user:cleanUser(req.user)});
  if(req.user.coins<def.unlock) return res.status(400).json({error:"Not enough coins."});
  req.user.coins-=def.unlock; req.user.unlocked.push(dim); save(); res.json({user:cleanUser(req.user)});
});
app.post("/api/mine",auth,(req,res)=>{
  const {region,dimension,x,y}=req.body;
  if(!regions.includes(region) || !dimensions[dimension] || !req.user.unlocked.includes(dimension)) return res.status(400).json({error:"Invalid region or locked dimension."});
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>80||y<0||y>30) return res.status(400).json({error:"Invalid block."});
  const w=world(region,dimension), key=`${x}:${y}`;
  if(w.blocks[key]) return res.status(409).json({error:"This block has already been mined."});
  const defs=dimensions[dimension].blocks;
  const depth=Math.max(0,Math.floor(y/5));
  const block=defs[Math.min(defs.length-1,Math.floor(depth/Math.max(1,Math.ceil(31/defs.length))))];
  const pick=item(req.user.equipped.pickaxe)||catalog[0];
  const damage=pick.power||2;
  if(damage<block.hp) return res.status(400).json({error:`Need a stronger tool. This block needs ${block.hp} mining power.`});
  if(countItems(req.user.inventory)>=req.user.capacity) return res.status(400).json({error:"Backpack full. Sell resources or buy a larger backpack."});
  w.blocks[key]=true;
  req.user.inventory[block.id]=(req.user.inventory[block.id]||0)+1;
  const coinBoost=req.user.boosts.coins?1.1:1, xpBoost=req.user.boosts.xp?1.1:1;
  const xp=Math.floor(block.xp*xpBoost); addXP(req.user,xp);
  save(); io.to(worldKey(region,dimension)).emit("block-mined",{x,y});
  res.json({block:block.name,itemId:block.id,coinsEarned:0,xp,user:cleanUser(req.user)});
});
app.post("/api/sell",auth,(req,res)=>{
  const id=String(req.body.itemId||""), qty=Math.floor(Number(req.body.quantity));
  if(!Number.isInteger(qty)||qty<1||qty>100000) return res.status(400).json({error:"Invalid quantity."});
  const dim=Object.values(dimensions).flatMap(d=>d.blocks).find(b=>b.id===id);
  if(!dim || (req.user.inventory[id]||0)<qty) return res.status(400).json({error:"Not enough of that resource."});
  const boost=req.user.boosts.coins?1.1:1;
  const earned=Math.floor(dim.coins*qty*boost);
  req.user.inventory[id]-=qty; if(!req.user.inventory[id]) delete req.user.inventory[id];
  req.user.coins+=earned; save(); res.json({earned,user:cleanUser(req.user)});
});
app.post("/api/buy",auth,(req,res)=>{
  const it=item(String(req.body.itemId||""));
  if(!it) return res.status(404).json({error:"Item not found."});
  if(req.user.owned.includes(it.id)) return res.status(400).json({error:"Already owned."});
  if(req.user.coins<it.price) return res.status(400).json({error:"Not enough coins."});
  req.user.coins-=it.price; req.user.owned.push(it.id);
  if(it.type==="backpack") req.user.capacity+=it.slots;
  if(it.type==="boost") req.user.boosts[it.boost]=true;
  save(); res.json({user:cleanUser(req.user)});
});
app.post("/api/equip",auth,(req,res)=>{
  const it=item(String(req.body.itemId||""));
  if(!it || !req.user.owned.includes(it.id) || !["pickaxe","sword","armor"].includes(it.type)) return res.status(400).json({error:"You do not own this equipment."});
  req.user.equipped[it.type]=it.id; save(); res.json({user:cleanUser(req.user)});
});
app.get("/api/bosses",auth,(req,res)=>{
  const region=req.query.region, dim=req.query.dimension;
  if(!regions.includes(region)||!dimensions[dim]||!req.user.unlocked.includes(dim)) return res.status(400).json({error:"Invalid region or locked dimension."});
  const list=bosses[dim].map(b=>({ ...b, ...(getBoss(region,dim,b.id).state) }));
  res.json({bosses:list});
});
app.post("/api/boss-hit",auth,(req,res)=>{
  const {region,dimension,bossId}=req.body;
  if(!regions.includes(region)||!dimensions[dimension]||!req.user.unlocked.includes(dimension)) return res.status(400).json({error:"Invalid location."});
  const found=getBoss(region,dimension,bossId); if(!found) return res.status(404).json({error:"Boss not found."});
  if(found.state.defeated) return res.status(400).json({error:"Boss already defeated."});
  const sword=item(req.user.equipped.sword), damage=sword?.damage||5;
  found.state.hp=Math.max(0,found.state.hp-damage);
  let reward=0;
  if(found.state.hp===0){found.state.defeated=true;reward=found.def.reward;req.user.coins+=reward;addXP(req.user,Math.floor(reward/10));}
  save(); io.to(worldKey(region,dimension)).emit("boss-update",{bossId,hp:found.state.hp,maxHp:found.state.maxHp,defeated:found.state.defeated});
  res.json({damage,reward,boss:found.state,user:cleanUser(req.user)});
});

app.get("/api/players",auth,(req,res)=>{
  const {region,dimension}=req.query;
  if(!regions.includes(region)||!dimensions[dimension]) return res.status(400).json({error:"Invalid world."});
  res.json({players:[...online.values()].filter(p=>p.region===region&&p.dimension===dimension&&p.id!==req.uid).map(p=>({id:p.id,username:p.username}))});
});
app.get("/api/friends",auth,(req,res)=>{
  const friends=db.friendships[req.uid]||[];
  const requests=Object.entries(db.requests).filter(([k,v])=>v.to===req.uid).map(([id,v])=>({id,from:v.from,username:db.users[v.from]?.username}));
  res.json({friends:friends.map(id=>({id,username:db.users[id]?.username,online:online.has(id)})),requests});
});
app.post("/api/friend-request",auth,(req,res)=>{
  const to=String(req.body.userId||"");
  if(!db.users[to]||to===req.uid) return res.status(400).json({error:"Invalid player."});
  if((db.friendships[req.uid]||[]).includes(to)) return res.status(400).json({error:"Already friends."});
  if(Object.values(db.requests).some(r=>r.from===req.uid&&r.to===to)||Object.values(db.requests).some(r=>r.from===to&&r.to===req.uid)) return res.status(400).json({error:"A request already exists."});
  const id=require("crypto").randomUUID(); db.requests[id]={from:req.uid,to}; save(); res.json({ok:true});
});
app.post("/api/friend-response",auth,(req,res)=>{
  const {requestId,accept}=req.body, r=db.requests[String(requestId)];
  if(!r||r.to!==req.uid) return res.status(404).json({error:"Request not found."});
  if(accept){db.friendships[r.from]=[...new Set([...(db.friendships[r.from]||[]),r.to])];db.friendships[r.to]=[...new Set([...(db.friendships[r.to]||[]),r.from])];}
  delete db.requests[requestId]; save(); res.json({ok:true});
});
app.get("/api/auctions",auth,(req,res)=>res.json({auctions:Object.values(db.auctions)}));
app.post("/api/auction",auth,(req,res)=>{
  const itemId=String(req.body.itemId||""), qty=Math.floor(Number(req.body.quantity)), start=Math.floor(Number(req.body.startPrice)), buyNow=Math.floor(Number(req.body.buyNow||0));
  const resource=Object.values(dimensions).flatMap(d=>d.blocks).find(b=>b.id===itemId);
  if(!resource||qty<1||qty>10000||start<1||!Number.isFinite(start)|| (buyNow && buyNow<start)) return res.status(400).json({error:"Invalid auction details."});
  if((req.user.inventory[itemId]||0)<qty) return res.status(400).json({error:"Not enough items."});
  req.user.inventory[itemId]-=qty; if(!req.user.inventory[itemId]) delete req.user.inventory[itemId];
  const id=require("crypto").randomUUID(); db.auctions[id]={id,itemId,qty,seller:req.uid,sellerName:req.user.username,bid:start,bidder:null,buyNow,createdAt:Date.now()}; save(); res.json({auction:db.auctions[id]});
});
app.post("/api/auction-bid",auth,(req,res)=>{
  const a=db.auctions[String(req.body.auctionId)], bid=Math.floor(Number(req.body.bid));
  if(!a||a.seller===req.uid||!Number.isFinite(bid)||bid<=a.bid||req.user.coins<bid) return res.status(400).json({error:"Invalid bid."});
  if(a.bidder){const old=db.users[a.bidder]; if(old) old.coins+=a.bid;}
  req.user.coins-=bid; a.bid=bid; a.bidder=req.uid; a.bidderName=req.user.username; save(); res.json({ok:true});
});
app.post("/api/auction-buy",auth,(req,res)=>{
  const a=db.auctions[String(req.body.auctionId)];
  if(!a||!a.buyNow||a.seller===req.uid||req.user.coins<a.buyNow) return res.status(400).json({error:"Buy Now unavailable."});
  req.user.coins-=a.buyNow; const seller=db.users[a.seller]; if(seller) seller.coins+=Math.floor(a.buyNow*.95);
  req.user.inventory[a.itemId]=(req.user.inventory[a.itemId]||0)+a.qty; delete db.auctions[a.id]; save(); res.json({ok:true});
});
app.post("/api/trade",auth,(req,res)=>{
  const to=String(req.body.to||""), itemId=String(req.body.itemId||""), qty=Math.floor(Number(req.body.quantity));
  if(!db.users[to]||!(db.friendships[req.uid]||[]).includes(to)||!itemId||qty<1||(req.user.inventory[itemId]||0)<qty) return res.status(400).json({error:"Trade requires an existing friend and valid items."});
  const id=require("crypto").randomUUID(); db.trades[id]={id,from:req.uid,to,itemId,qty,fromConfirm:0,toConfirm:0}; save(); res.json({trade:db.trades[id]});
});
app.post("/api/trade-confirm",auth,(req,res)=>{
  const t=db.trades[String(req.body.tradeId)]; if(!t||![t.from,t.to].includes(req.uid)) return res.status(404).json({error:"Trade not found."});
  const key=req.uid===t.from?"fromConfirm":"toConfirm"; t[key]++;
  if(t.fromConfirm>=2&&t.toConfirm>=2){
    const from=db.users[t.from],to=db.users[t.to];
    if((from.inventory[t.itemId]||0)<t.qty){delete db.trades[t.id];return res.status(400).json({error:"Sender no longer has the items."});}
    from.inventory[t.itemId]-=t.qty; if(!from.inventory[t.itemId]) delete from.inventory[t.itemId];
    to.inventory[t.itemId]=(to.inventory[t.itemId]||0)+t.qty; delete db.trades[t.id];
  }
  save(); res.json({ok:true,completed:!db.trades[t.id]});
});

const online = new Map();
io.use((socket,next)=>{
  try { const p=jwt.verify(socket.handshake.auth?.token||"",JWT_SECRET); if(!db.users[p.id]) throw Error(); socket.uid=p.id; next(); }
  catch { next(new Error("Unauthorized")); }
});
io.on("connection",socket=>{
  const u=db.users[socket.uid]; online.set(socket.uid,{id:socket.uid,username:u.username,region:"Asia",dimension:"plains",socketId:socket.id});
  socket.on("join-world",({region,dimension})=>{
    if(!regions.includes(region)||!dimensions[dimension]||!u.unlocked.includes(dimension)) return;
    for(const room of socket.rooms) if(room!==socket.id) socket.leave(room);
    const room=worldKey(region,dimension); socket.join(room);
    const p=online.get(socket.uid); Object.assign(p,{region,dimension});
    socket.to(room).emit("player-joined",{id:socket.uid,username:u.username});
    socket.emit("world-joined",{players:[...online.values()].filter(x=>x.region===region&&x.dimension===dimension&&x.id!==socket.uid).map(x=>({id:x.id,username:x.username}))});
  });
  socket.on("move",pos=>{
    if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y)) return;
    const p=online.get(socket.uid); if(!p)return;
    socket.to(worldKey(p.region,p.dimension)).emit("player-moved",{id:socket.uid,x:Math.max(0,Math.min(5000,pos.x)),y:Math.max(0,Math.min(2000,pos.y))});
  });
  socket.on("chat",message=>{
    const p=online.get(socket.uid); if(!p||typeof message!=="string")return;
    const clean=message.trim().slice(0,180); if(clean) io.to(worldKey(p.region,p.dimension)).emit("chat",{username:u.username,message:clean});
  });
  socket.on("disconnect",()=>{const p=online.get(socket.uid); if(p)io.to(worldKey(p.region,p.dimension)).emit("player-left",{id:socket.uid}); online.delete(socket.uid);});
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
server.listen(PORT,()=>console.log(`PixelVerse running on ${PORT}`));
