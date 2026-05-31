const https = require('https');

function fetchPage(page, names) {
  https.get(`https://mlb26.theshow.com/apis/items.json?page=${page}&type=mlb_card`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        for (const name of names) {
          const player = parsed.items.find(x => x.name.toLowerCase().replace(/é/g, 'e').includes(name));
          if (player) {
            console.log('FOUND PLAYER:', player.name, 'on page', page);
            console.log('PITCHES:', JSON.stringify(player.pitches, null, 2));
            console.log('CURRENT_ATTRIBUTES:', JSON.stringify(player.current_attributes, null, 2));
          }
        }
        if (page < parsed.total_pages) {
          fetchPage(page + 1, names);
        }
      } catch (err) {
        console.error('Error parsing JSON on page', page, err);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching page', page, err);
  });
}

fetchPage(1, ['gerrit cole', 'clayton kershaw']);
