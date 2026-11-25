// The stocks students choose from: companies they are likely to know, Bermuda's bank and the Bermuda reinsurers
// that trade on a US exchange, and one fund. (Others with a big Bermuda presence, such as PartnerRe, Aspen and
// Enstar, are privately owned, so they have no share price to show.)
// Descriptions are written for this app. Keep the list at 50 or fewer: the free price key allows 60 requests a
// minute and every stock costs one each time prices refresh (see warm() in the server).
import type { Sector, Stock } from '@/lib/types';

export const SECTORS: Sector[] = ['Tech', 'Games & Fun', 'Food & Drink', 'Shops & Style', 'Travel & Cars', 'Money', 'Health', 'Bermuda', 'Funds'];

const s = (symbol: string, name: string, sector: Sector, about: string): Stock => ({ symbol, name, sector, about });

export const STOCKS: Stock[] = [
  s('AAPL', 'Apple', 'Tech', 'Makes the iPhone, iPad and Mac, and runs the App Store.'),
  s('MSFT', 'Microsoft', 'Tech', 'Makes Windows, Office and the Xbox, and rents out huge computers over the internet.'),
  s('GOOGL', 'Alphabet (Google)', 'Tech', 'Owns Google Search, YouTube and Android. Most of its money comes from adverts.'),
  s('AMZN', 'Amazon', 'Tech', 'Sells almost everything online and delivers it. Also rents computing power to other companies.'),
  s('NVDA', 'Nvidia', 'Tech', 'Designs the powerful chips used for video games and artificial intelligence.'),
  s('META', 'Meta (Instagram)', 'Tech', 'Owns Instagram, WhatsApp and Facebook. Most of its money comes from adverts.'),
  s('AMD', 'AMD', 'Tech', 'Designs computer chips, including the ones inside the PlayStation and Xbox.'),
  s('DUOL', 'Duolingo', 'Tech', 'Runs the Duolingo app for learning languages. Some people pay to remove adverts.'),
  s('NFLX', 'Netflix', 'Tech', 'Streams films and series to people who pay a monthly fee.'),
  s('SPOT', 'Spotify', 'Games & Fun', 'Streams music and podcasts. People pay monthly or listen with adverts.'),

  s('DIS', 'Disney', 'Games & Fun', 'Makes films and series, runs theme parks and cruise ships, and owns Marvel, Pixar and Star Wars.'),
  s('RBLX', 'Roblox', 'Games & Fun', 'Runs the Roblox platform, where players build and play games. It sells the in-game currency.'),
  s('SONY', 'Sony', 'Games & Fun', 'Makes the PlayStation, cameras and TVs, and owns film and music studios.'),
  s('EA', 'Electronic Arts', 'Games & Fun', 'Makes video games such as EA Sports FC, Madden and The Sims.'),
  s('TTWO', 'Take-Two', 'Games & Fun', 'Makes video games such as NBA 2K and Grand Theft Auto.'),
  s('HAS', 'Hasbro', 'Games & Fun', 'Makes toys and games such as Monopoly, Nerf and Play-Doh.'),
  s('MAT', 'Mattel', 'Games & Fun', 'Makes toys such as Barbie, Hot Wheels and UNO.'),

  s('MCD', "McDonald's", 'Food & Drink', 'Fast-food restaurants around the world. Most are run by local owners who pay McDonald\'s a share.'),
  s('SBUX', 'Starbucks', 'Food & Drink', 'Coffee shops in more than 80 countries.'),
  s('KO', 'Coca-Cola', 'Food & Drink', 'Makes Coca-Cola, Sprite, Fanta and many other drinks.'),
  s('PEP', 'PepsiCo', 'Food & Drink', 'Makes Pepsi and Gatorade, and snacks such as Lay\'s and Doritos.'),
  s('CMG', 'Chipotle', 'Food & Drink', 'Restaurants that make burritos and bowls to order.'),
  s('YUM', 'Yum! Brands (KFC)', 'Food & Drink', 'Owns KFC, Pizza Hut and Taco Bell.'),
  s('HSY', 'Hershey', 'Food & Drink', 'Makes chocolate and sweets such as Hershey\'s and Reese\'s.'),

  s('NKE', 'Nike', 'Shops & Style', 'Designs and sells trainers and sports clothing.'),
  s('CROX', 'Crocs', 'Shops & Style', 'Makes Crocs clogs and other casual shoes.'),
  s('LULU', 'Lululemon', 'Shops & Style', 'Designs and sells sports and yoga clothing.'),
  s('TGT', 'Target', 'Shops & Style', 'A big chain of general stores in the United States.'),
  s('WMT', 'Walmart', 'Shops & Style', 'The world\'s biggest chain of supermarkets and general stores.'),
  s('COST', 'Costco', 'Shops & Style', 'Warehouse stores where members pay a yearly fee to buy in bulk at low prices.'),

  s('TSLA', 'Tesla', 'Travel & Cars', 'Makes electric cars and batteries.'),
  s('F', 'Ford', 'Travel & Cars', 'One of the oldest car makers. Known for trucks such as the F-150.'),
  s('UBER', 'Uber', 'Travel & Cars', 'Runs the app that matches riders with drivers, and delivers food with Uber Eats.'),
  s('ABNB', 'Airbnb', 'Travel & Cars', 'Runs the website where people rent out homes and rooms to travellers.'),
  s('DAL', 'Delta Air Lines', 'Travel & Cars', 'An airline that flies passengers around the world, including to Bermuda.'),
  s('RCL', 'Royal Caribbean', 'Travel & Cars', 'Runs cruise ships, some of which visit Bermuda.'),

  s('V', 'Visa', 'Money', 'Runs the network that moves money when people pay by Visa card.'),
  s('JPM', 'JPMorgan Chase', 'Money', 'The largest bank in the United States.'),
  s('PYPL', 'PayPal', 'Money', 'Lets people pay and send money online. It also owns Venmo.'),

  s('JNJ', 'Johnson & Johnson', 'Health', 'Makes medicines and medical equipment.'),
  s('PFE', 'Pfizer', 'Health', 'Invents and makes medicines and vaccines.'),

  s('NTB', 'Butterfield Bank', 'Bermuda', 'A bank founded in Bermuda in 1858, with branches across the island.'),
  s('RNR', 'RenaissanceRe', 'Bermuda', 'A Bermuda reinsurer. It insures insurance companies against disasters such as hurricanes.'),
  s('ACGL', 'Arch Capital', 'Bermuda', 'One of the biggest Bermuda insurers. It insures businesses and home loans, and reinsures other insurers.'),
  s('EG', 'Everest Group', 'Bermuda', 'A Bermuda reinsurer. Insurance companies around the world pay it to share their biggest risks.'),
  s('AXS', 'AXIS Capital', 'Bermuda', 'A Bermuda insurer for unusual risks such as ships, cyber attacks and big building projects. It reinsures too.'),
  s('HG', 'Hamilton Insurance', 'Bermuda', 'A newer Bermuda insurer and reinsurer with its head office in Pembroke.'),
  s('SPNT', 'SiriusPoint', 'Bermuda', 'A Bermuda insurer and reinsurer that also teams up with small specialist insurance businesses.'),

  s('SPY', 'S&P 500 fund (SPY)', 'Funds', 'One share owns a tiny piece of 500 of the largest US companies at once.'),
  s('QQQ', 'Nasdaq 100 fund (QQQ)', 'Funds', 'One share owns a tiny piece of 100 big companies on the Nasdaq exchange, many of them tech.'),
];
