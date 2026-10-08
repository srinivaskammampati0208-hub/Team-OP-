const doctorForm = document.querySelector("#doctorSelection");

if (doctorForm) {
  const createCallButton = document.querySelector("#createCallButton");
  const callStatus = document.querySelector("#callStatus");
  const callLinks = document.querySelector("#callLinks");
  const joinCallLink = document.querySelector("#joinCallLink");
  const doctorInviteLink = document.querySelector("#doctorInviteLink");
  const copyInviteButton = document.querySelector("#copyInviteButton");
  let inviteUrl = "";

  doctorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!doctorForm.reportValidity()) return;

    const selectedDoctor = doctorForm.querySelector("input[name='doctor']:checked");
    if (!selectedDoctor) return;

    callLinks.hidden = true;
    callStatus.textContent = "Creating a private Daily room…";
    createCallButton.disabled = true;

    try {
      if (window.location.protocol === "file:") {
        throw new Error("Open this page through the local server at http://127.0.0.1:8000 and set DAILY_API_KEY; see README.md.");
      }

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor_id: selectedDoctor.value }),
      });
      let result;
      try {
        result = await response.json();
      } catch (error) {
        throw new Error(`The call server returned an unreadable response (${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(result.detail || `The call server returned ${response.status}.`);
      }
      if (
        typeof result.patient_url !== "string" ||
        typeof result.doctor_invite_url !== "string" ||
        !result.patient_url.startsWith("https://") ||
        !result.doctor_invite_url.startsWith("https://")
      ) {
        throw new Error("The call server returned invalid room links.");
      }

      joinCallLink.href = result.patient_url;
      doctorInviteLink.href = result.doctor_invite_url;
      inviteUrl = result.doctor_invite_url;
      callLinks.hidden = false;
      callStatus.textContent = `A private room is ready for ${result.doctor_name}. Open the call, then securely invite your real clinician.`;
    } catch (error) {
      callStatus.textContent = `Could not create the video room: ${error.message}`;
    } finally {
      createCallButton.disabled = false;
    }
  });

  copyInviteButton.addEventListener("click", async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      copyInviteButton.textContent = "Invite copied";
    } catch (error) {
      callStatus.textContent = "Could not copy the invite link. Use “Open clinician invite” and copy the address from your browser.";
    }
  });
}
