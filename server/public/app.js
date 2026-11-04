const textForm = document.querySelector("#text-form");
const textInput = document.querySelector("#text-input");
const sendButton = document.querySelector("#send-button");
const recordButton = document.querySelector("#record-button");
const recordLabel = document.querySelector("#record-label");
const recordHint = document.querySelector("#record-hint");
const recordVisual = document.querySelector("#record-visual");
const timer = document.querySelector("#timer");
const serverStatus = document.querySelector("#server-status");
const resultPlaceholder = document.querySelector("#result-placeholder");
const resultContent = document.querySelector("#result-content");
const resultError = document.querySelector("#result-error");

let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let timerInterval = null;
let stopTimeout = null;
let recordingStartedAt = 0;

function setBusy(isBusy) {
  sendButton.disabled = isBusy;
  recordButton.disabled = isBusy;
}

function showResult(result) {
  resultPlaceholder.hidden = true;
  resultError.hidden = true;
  resultContent.hidden = false;
  document.querySelector("#result-kind").textContent = result.kind;
  document.querySelector("#result-transcript").textContent = result.transcript;
  document.querySelector("#result-command").textContent = result.command;
  document.querySelector("#result-reply").textContent = result.replyText;
}

function showError(message) {
  resultPlaceholder.hidden = true;
  resultContent.hidden = true;
  resultError.hidden = false;
  document.querySelector("#error-message").textContent = message;
}

async function readResponse(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || `Request failed with status ${response.status}.`);
  }
  return body;
}

textForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = textInput.value.trim();
  if (!text) return;

  setBusy(true);
  sendButton.firstChild.textContent = "Working… ";
  try {
    const response = await fetch("/api/v1/interpret-text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    showResult(await readResponse(response));
  } catch (error) {
    showError(error instanceof Error ? error.message : "Unknown request error.");
  } finally {
    setBusy(false);
    sendButton.firstChild.textContent = "Send to assistant ";
  }
});

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    textInput.value = button.dataset.example;
    textInput.focus();
  });
});

function chooseAudioType() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function extensionForType(type) {
  if (type.includes("mp4")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  return "webm";
}

function updateTimer() {
  const elapsed = Math.min(10, (Date.now() - recordingStartedAt) / 1000);
  timer.textContent = `00:${String(Math.floor(elapsed)).padStart(2, "0")}`;
}

function releaseMicrophone() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
}

function resetRecorder() {
  clearInterval(timerInterval);
  clearTimeout(stopTimeout);
  timerInterval = null;
  stopTimeout = null;
  recordButton.classList.remove("recording");
  recordVisual.classList.remove("recording");
  recordLabel.textContent = "Start recording";
  recordHint.textContent = "Your browser will ask for microphone permission. Maximum 10 seconds.";
  timer.textContent = "00:00";
}

async function uploadRecording(blob, mimeType) {
  setBusy(true);
  recordLabel.textContent = "Transcribing…";
  const formData = new FormData();
  formData.append("audio", blob, `recording.${extensionForType(mimeType)}`);

  try {
    const response = await fetch("/api/v1/voice", { method: "POST", body: formData });
    showResult(await readResponse(response));
  } catch (error) {
    showError(error instanceof Error ? error.message : "Audio request failed.");
  } finally {
    setBusy(false);
    resetRecorder();
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    showError("This browser does not support microphone recording.");
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const mimeType = chooseAudioType();
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);
    audioChunks = [];

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    });
    mediaRecorder.addEventListener("stop", () => {
      const actualType = mediaRecorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(audioChunks, { type: actualType });
      releaseMicrophone();
      void uploadRecording(blob, actualType);
    }, { once: true });

    mediaRecorder.start();
    recordingStartedAt = Date.now();
    recordButton.classList.add("recording");
    recordVisual.classList.add("recording");
    recordLabel.textContent = "Stop recording";
    recordHint.textContent = "Recording now. Click stop when you are finished.";
    updateTimer();
    timerInterval = setInterval(updateTimer, 200);
    stopTimeout = setTimeout(stopRecording, 10_000);
  } catch (error) {
    releaseMicrophone();
    resetRecorder();
    showError(error instanceof Error ? error.message : "Microphone access was denied.");
  }
}

function stopRecording() {
  if (mediaRecorder?.state === "recording") {
    clearInterval(timerInterval);
    clearTimeout(stopTimeout);
    recordLabel.textContent = "Preparing audio…";
    recordHint.textContent = "Sending the recording to Groq Whisper.";
    mediaRecorder.stop();
  }
}

recordButton.addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") stopRecording();
  else void startRecording();
});

async function checkHealth() {
  try {
    const response = await fetch("/health");
    if (!response.ok) throw new Error();
    serverStatus.classList.add("online");
    serverStatus.querySelector("span:last-child").textContent = "Server online";
  } catch {
    serverStatus.classList.add("offline");
    serverStatus.querySelector("span:last-child").textContent = "Server offline";
  }
}

void checkHealth();
