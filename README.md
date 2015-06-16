# Bozo

Bozo was Rita Skeeter's photographer and they both worked for Daily Prophet. [Ref](http://harrypotter.wikia.com/wiki/Bozo).    
Now Bozo works for Razorpay. He takes photos of our webpages.

## What will Bozo do?
Bozo will run on Wercker. When the wizards and witches push their code to GitHub, a wercker build will start. If Bozo is part of the build process, it will open the provided url, which can be local or web, and take screenshots of the pages given. Bozo will then process the photos to see if the pages have changed since last time. Whatever the result, Bozo will **not** scream error but simply post the result on Slack. Good Bozo. Here, take a chocolate frog.

## Tech
Bozo will make use of two core features of Browserstack, a muggle company: Screenshot and Tunnel.
