const form = document.getElementById("auth-form");
if(form){
  form.addEventListener("submit", async e=>{
    e.preventDefault();
    const name=document.getElementById("name").value;
    const email=document.getElementById("email").value;
    const password=document.getElementById("password").value;
    const sport=document.getElementById("sport")?.value;
    const params=new URLSearchParams(window.location.search);
    const role=params.get("role")||"player";

    const res = await fetch("http://localhost:5000/api/auth/signup",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name,email,password,role,sport})
    });
    const data=await res.json();
    if(data.token){
      localStorage.setItem("token",data.token);
      localStorage.setItem("userId",data.user._id);
      window.location.href="dashboard.html";
    } else { alert(data.message); }
  });
}
