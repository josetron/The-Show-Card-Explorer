const https = require('https');

function fetchPage(page) {
  https.get(`https://mlb26.theshow.com/apis/items.json?page=${page}&type=mlb_card`, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const alvarado = parsed.items.find(x => x.name.toLowerCase().replace(/é/g, 'e').includes('jose alvarado'));
        if (alvarado) {
          console.log('FOUND JOSE ALVARADO on page', page);
          console.log(JSON.stringify(alvarado, null, 2));
        } else if (page < parsed.total_pages) {
          fetchPage(page + 1);
        } else {
          console.log('NOT FOUND ANYWHERE');
        }
      } catch (err) {
        console.error('Error parsing JSON on page', page, err);
      }
    });
  }).on('error', (err) => {
    console.error('Error fetching page', page, err);
  });
}

fetchPage(1);
