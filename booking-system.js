const {Pool}=require("pg");
const nodemailer=require("nodemailer");
const crypto=require("node:crypto");
const pool=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DB_SSL==="true"?{rejectUnauthorized:true}:undefined}):null;
let ready;
async function db(){if(!pool)throw Error("DATABASE_URL missing");if(!ready)ready=pool.query("CREATE TABLE IF NOT EXISTS bookings(id BIGSERIAL PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(200) NOT NULL,phone VARCHAR(40) NOT NULL,service VARCHAR(80) NOT NULL,appointment_date DATE NOT NULL,message VARCHAR(1000) NOT NULL DEFAULT '',language VARCHAR(2) NOT NULL DEFAULT 'my',status VARCHAR(12) NOT NULL DEFAULT 'Pending',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())").catch(e=>{ready=null;throw e});await ready;return pool}
const states=["Pending","Confirmed","Completed","Cancelled"];
const translations={
 en:{title:"Booking Admin Dashboard",subtitle:"Latest 200 booking requests",id:"ID",name:"Name",email:"Email",phone:"Phone",service:"Service",date:"Date",notes:"Notes",status:"Status",save:"Save",back:"Booking Form",notice:"A new booking request has arrived. Open your private dashboard to review it.",subject:"Soe Kalayar: New booking request"},
 my:{title:"ချိန်းဆိုမှု စီမံခန့်ခွဲရေး",subtitle:"နောက်ဆုံး ချိန်းဆိုမှုတောင်းဆိုချက် ၂၀၀",id:"အမှတ်",name:"အမည်",email:"အီးမေးလ်",phone:"ဖုန်း",service:"ဝန်ဆောင်မှု",date:"ရက်စွဲ",notes:"မှတ်ချက်",status:"အခြေအနေ",save:"သိမ်းဆည်းရန်",back:"ချိန်းဆိုရန်",notice:"ချိန်းဆိုမှုတောင်းဆိုချက်အသစ် ရရှိထားပါသည်။ အသေးစိတ်ကို Admin Dashboard မှာ ကြည့်ရှုပါ။",subject:"Soe Kalayar: ချိန်းဆိုမှုအသစ်"}
};
const stateLabels={my:{Pending:"စောင့်ဆိုင်းဆဲ",Confirmed:"အတည်ပြုပြီး",Completed:"ပြီးစီး",Cancelled:"ပယ်ဖျက်ပြီး"},en:{Pending:"Pending",Confirmed:"Confirmed",Completed:"Completed",Cancelled:"Cancelled"}};

function eq(a,b){return crypto.timingSafeEqual(crypto.createHash("sha256").update(a).digest(),crypto.createHash("sha256").update(b).digest())}
function auth(req,res,next){let user="",pass="";try{const v=Buffer.from((req.get("authorization")||"").replace(/^Basic /,""),"base64").toString().split(":");user=v.shift();pass=v.join(":")}catch{}const expected=process.env.ADMIN_PASSWORD;if(!expected||expected.length<16||!eq(user,process.env.ADMIN_EMAIL||"soekhubzone@gmail.com")||!eq(pass,expected)){res.set("WWW-Authenticate",'Basic realm="Soe Kalayar Admin"');return res.status(401).send("Authentication required")}next()}
const counts=new Map();
function limit(req,res,next){const now=Date.now(),key=req.ip,entry=counts.get(key)||{n:0,until:now+3600000};if(now>entry.until){entry.n=0;entry.until=now+3600000}entry.n++;counts.set(key,entry);if(counts.size>5000)counts.clear();if(entry.n>15)return res.status(429).send("Try again later");next()}
async function notify(){const e=process.env;if(!e.SMTP_HOST||!e.SMTP_USER||!e.SMTP_PASSWORD){console.warn("Booking saved but email is not configured");return}const smtp=nodemailer.createTransport({host:e.SMTP_HOST,port:Number(e.SMTP_PORT||587),secure:Number(e.SMTP_PORT||587)===465,auth:{user:e.SMTP_USER,pass:e.SMTP_PASSWORD}});await smtp.sendMail({from:e.SMTP_USER,to:e.ADMIN_EMAIL||"soekhubzone@gmail.com",subject:translations.my.subject+" / New booking request",text:translations.my.notice+"\n\n"+translations.en.notice})}
function installBookingRoutes(app,{page,labels,preferredLanguage,respondHtml,escapeHtml,allowedServices}){
app.post("/booking",limit,async(req,res)=>{const lang=preferredLanguage(req),t=labels[lang];const {name,email,phone,service,date,message=""}=req.body||{};const valid=[name,email,phone,service,date,message].every(v=>typeof v==="string")&&name.trim().length>0&&name.length<=100&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=200&&phone.trim().length>0&&phone.length<=40&&allowedServices.includes(service)&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date&&message.length<=1000;if(!valid)return respondHtml(res,400,page(lang,"<h1>"+t.invalid+"</h1>"));try{const p=await db();await p.query("INSERT INTO bookings(name,email,phone,service,appointment_date,message,language) VALUES($1,$2,$3,$4,$5,$6,$7)",[name.trim(),email.trim(),phone.trim(),service,date,message,lang])}catch{console.error("Booking storage failed");return respondHtml(res,503,page(lang,"<h1>"+t.error+"</h1>"))}notify().catch(()=>console.error("Email notification failed"));return respondHtml(res,200,page(lang,"<h1>"+t.received+"</h1><p>"+t.thanks+"</p><a href='/?lang="+lang+"'>"+t.home+"</a>"))});
app.get("/admin",auth,async(req,res)=>{
 const lang=req.query.lang==="en"?"en":"my",t=translations[lang];
 try{
  const p=await db();
  const result=await p.query("SELECT id,name,email,phone,service,TO_CHAR(appointment_date,'YYYY-MM-DD') AS date,message,status FROM bookings ORDER BY created_at DESC LIMIT 200");
  const rows=result.rows.map(b=>"<tr>"+[b.id,b.name,b.email,b.phone,b.service,b.date,b.message].map(v=>"<td>"+escapeHtml(v)+"</td>").join("")+
   "<td><form method='post' action='/admin/status'><input type='hidden' name='lang' value='"+lang+"'><input type='hidden' name='id' value='"+b.id+"'><select name='status'>"+
   states.map(st=>"<option value='"+st+"' "+(st===b.status?"selected":"")+">"+stateLabels[lang][st]+"</option>").join("")+
   "</select><button>"+t.save+"</button></form></td></tr>").join("");
  const headers=[t.id,t.name,t.email,t.phone,t.service,t.date,t.notes,t.status].map(v=>"<th>"+v+"</th>").join("");
  const html="<header><h1>"+t.title+"</h1><nav class='language'><a href='/admin?lang=my' "+(lang==="my"?"aria-current='page'":"")+">မြန်မာ</a> <a href='/admin?lang=en' "+(lang==="en"?"aria-current='page'":"")+">English</a></nav></header>"+
   "<p>"+t.subtitle+"</p><p><a href='/?lang="+lang+"'>"+t.back+"</a></p><div style='overflow-x:auto'><table border='1' cellpadding='8'><thead><tr>"+headers+"</tr></thead><tbody>"+rows+"</tbody></table></div>";
  return respondHtml(res,200,page(lang,html));
 }catch{return res.status(503).send(lang==="my"?"ဒေတာဘေ့စ် ချိတ်ဆက်မရပါ။":"Database unavailable")}
});
app.post("/admin/status",auth,async(req,res)=>{const origin=req.get("origin");if(!origin||origin!=="https://"+req.get("host"))return res.status(403).send("Invalid origin");const id=Number(req.body.id),status=req.body.status;if(!Number.isSafeInteger(id)||id<=0||!states.includes(status))return res.status(400).send("Invalid input");try{const p=await db();await p.query("UPDATE bookings SET status=$1 WHERE id=$2",[status,id]);return res.redirect(303,"/admin?lang="+(req.body.lang==="en"?"en":"my"))}catch{return res.status(503).send("Update failed")}});
}
module.exports={installBookingRoutes};
