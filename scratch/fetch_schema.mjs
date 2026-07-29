const url = "https://puooflndahuffzlkssif.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1b29mbG5kYWh1ZmZ6bGtzc2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NTgwNDMsImV4cCI6MjA5NTUzNDA0M30.deHVkw3Kg8rjEiCaXHgp3qKkjgA6RKTTV79VoRRudts";
fetch(url).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.definitions.profiles.properties, null, 2));
}).catch(console.error);
