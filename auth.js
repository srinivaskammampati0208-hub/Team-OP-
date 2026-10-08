const AUTH_KEY = "healai.demo-authenticated";
const isLoginPage = window.location.pathname.endsWith("/login.html");

if (isLoginPage) {
  if (sessionStorage.getItem(AUTH_KEY) === "true") {
    window.location.replace("index.html");
  }
} else if (sessionStorage.getItem(AUTH_KEY) !== "true") {
  window.location.replace("login.html");
}

document.addEventListener("DOMContentLoaded", () => {
  if (isLoginPage) {
    const loginForm = document.querySelector("#loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }

      sessionStorage.setItem(AUTH_KEY, "true");
      window.location.replace("index.html");
    });
    return;
  }

  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const logoutLink = document.createElement("a");
  logoutLink.href = "login.html";
  logoutLink.textContent = "Log out";
  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    sessionStorage.removeItem(AUTH_KEY);
    window.location.replace("login.html");
  });
  navLinks.appendChild(logoutLink);
});
