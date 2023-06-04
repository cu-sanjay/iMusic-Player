const API_KEY = "AIzaSyAO9zkkvJbZZaIoh_4M7tq4Bu-rfF8qSvY";
const CHANNEL_ID = "UCN54XS13t38DD3vYS2jvVJw";

async function getPlayedVideos() {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&channelId=${UCN54XS13t38DD3vYS2jvVJw}&key=${AIzaSyAO9zkkvJbZZaIoh_4M7tq4Bu-rfF8qSvY}&type=video`);
  const data = await response.json();
  const videoData = document.getElementById("videoData");

  data.items.forEach(item => {
    const videoTitle = item.snippet.title;
    const videoId = item.id.videoId;

    const row = document.createElement("tr");
    const titleCell = document.createElement("td");
    titleCell.textContent = videoTitle;
    row.appendChild(titleCell);

    const idCell = document.createElement("td");
    idCell.textContent = videoId;
    row.appendChild(idCell);

    videoData.appendChild(row);
  });
}

getPlayedVideos().catch(console.error);
