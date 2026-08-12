/**
 * Seed full menu for Pizzeria Italiana.
 * Run: node scripts/seed-italiana-menu.mjs
 */
import mongoose from 'mongoose'
import { Category, Food, Restaurant } from '../src/models/index.js'
import { publishRestaurantMenu } from '../src/services/menu.js'

const RESTAURANT_NAME = 'Pizzeria Italiana'

const IMG = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  calzone: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d264?w=800&q=80',
  bun: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
  starter: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  drink: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80',
  sauce: 'https://images.unsplash.com/photo-1472476443507-c7a9ba75f9b3?w=800&q=80'
}

function ings(...parts) {
  return parts.map((p) => p.trim()).filter(Boolean)
}

function pizza(title, description, ingredients, p32, p42, { spicy = false, note = '' } = {}) {
  const desc = [note, description, spicy ? 'Ostre' : ''].filter(Boolean).join(' · ')
  return {
    title,
    description: desc,
    ingredients,
    image: IMG.pizza,
    variations: [
      { title: '32 cm', price: p32, discounted: 0, addons: [] },
      { title: '42 cm', price: p42, discounted: 0, addons: [] }
    ]
  }
}

function salad(title, description, ingredients, small, large, { spicy = false, note = '' } = {}) {
  const desc = [note, description, spicy ? 'Ostre' : ''].filter(Boolean).join(' · ')
  return {
    title,
    description: desc,
    ingredients,
    image: IMG.salad,
    variations: [
      { title: 'Mała', price: small, discounted: 0, addons: [] },
      { title: 'Duża', price: large, discounted: 0, addons: [] }
    ]
  }
}

function simple(title, description, ingredients, price, image, { spicy = false } = {}) {
  return {
    title,
    description: spicy ? `${description} · Ostre` : description,
    ingredients,
    image,
    variations: [{ title: 'Standard', price, discounted: 0, addons: [] }]
  }
}

const MENU = [
  {
    title: 'Pizza Gourmet',
    foods: [
      pizza(
        'Magyar',
        'sos z włoskich pomidorów, mozzarella fior di latte, salami z mangalicy, pieczona papryka, czerwona cebula, majonez z pastą Édes Anna',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Salami z mangalicy',
          'Pieczona papryka',
          'Czerwona cebula',
          'Majonez z pastą Édes Anna'
        ),
        44,
        54,
        { spicy: true }
      ),
      pizza(
        'Peperonata',
        'sos z włoskich pomidorów, mozzarella fior di latte, salsiccia i peperoncino, pieczona papryka, czerwona cebula, sycylijskie oregano',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Salsiccia i peperoncino',
          'Pieczona papryka',
          'Czerwona cebula',
          'Sycylijskie oregano'
        ),
        38,
        50
      ),
      pizza(
        'Pizza Pera',
        'sos kremowy, mozzarella fior di latte, gruszka, salsiccia i peperoncino, gorgonzola DOP, miętowe pesto',
        ings(
          'Sos kremowy',
          'Mozzarella fior di latte',
          'Gruszka',
          'Salsiccia i peperoncino',
          'Gorgonzola DOP',
          'Miętowe pesto'
        ),
        38,
        50
      ),
      pizza(
        'Burrata',
        'oliwa czosnkowa, mozzarella fior di latte, pomidory pokrojone w kostkę, bazylia, szynka Crudo di Parma, burrata, pesto bazyliowe',
        ings(
          'Oliwa czosnkowa',
          'Mozzarella fior di latte',
          'Pomidory',
          'Bazylia',
          'Szynka Crudo di Parma',
          'Burrata',
          'Pesto bazyliowe'
        ),
        44,
        54
      ),
      pizza(
        'Pulled Pork',
        'sos kremowy, mozzarella fior di latte, szarpana wieprzowina pieczona przez 12 godzin, smażona czerwona cebula, papryka jalapeño, sos BBQ Mississippi',
        ings(
          'Sos kremowy',
          'Mozzarella fior di latte',
          'Szarpana wieprzowina',
          'Smażona czerwona cebula',
          'Papryka jalapeño',
          'Sos BBQ Mississippi'
        ),
        37,
        49,
        { spicy: true }
      )
    ]
  },
  {
    title: 'Pizza Klasyczna',
    foods: [
      pizza(
        'Margherita TOP',
        'Sos z włoskich pomidorów, mozzarella fior di latte w kulce, grana padano D.O.P, bazylia, oliwa Extra virgin',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte w kulce',
          'Grana Padano DOP',
          'Bazylia',
          'Oliwa Extra virgin'
        ),
        35,
        35,
        { note: 'Pizza Miesiąca' }
      ),
      pizza(
        'Margherita',
        'sos z włoskich pomidorów, mozzarella fior di latte, świeża bazylia',
        ings('Sos z włoskich pomidorów', 'Mozzarella fior di latte', 'Świeża bazylia'),
        29,
        40
      ),
      pizza(
        'Capricciosa',
        'sos z włoskich pomidorów, mozzarella fior di latte, szynka Prosciutto Cotto, pieczarki',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Szynka Prosciutto Cotto',
          'Pieczarki'
        ),
        32,
        43
      ),
      pizza(
        'Salame',
        'sos z włoskich pomidorów, mozzarella fior di latte, łagodne salami Napoli, sycylijskie oregano',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Łagodne salami Napoli',
          'Sycylijskie oregano'
        ),
        33,
        44
      ),
      pizza(
        'Picante',
        'sos z włoskich pomidorów, mozzarella fior di latte, włoskie salami picante, sycylijskie oregano',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Włoskie salami picante',
          'Sycylijskie oregano'
        ),
        33,
        44,
        { spicy: true }
      ),
      pizza(
        'Quattro Formaggi',
        'sos z włoskich pomidorów, mozzarella fior di latte, gorgonzola DOP, camembert, Grana Padano DOP',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Gorgonzola DOP',
          'Camembert',
          'Grana Padano DOP'
        ),
        38,
        50
      ),
      pizza(
        'Quattro Stagioni',
        'cztery smaki — sos z włoskich pomidorów, mozzarella fior di latte, szynka Prosciutto Cotto, łagodne salami Napoli, pieczarki, karczochy',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Szynka Prosciutto Cotto',
          'Łagodne salami Napoli',
          'Pieczarki',
          'Karczochy'
        ),
        36,
        47
      ),
      pizza(
        'Prosciutto e Salame',
        'sos z włoskich pomidorów, mozzarella fior di latte, szynka Prosciutto Cotto, łagodne salami Napoli, pieczarki',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Szynka Prosciutto Cotto',
          'Łagodne salami Napoli',
          'Pieczarki'
        ),
        35,
        50
      ),
      pizza(
        'Pancetta e Picante',
        'sos z włoskich pomidorów, mozzarella fior di latte, Pancetta, włoskie salami picante, gorgonzola DOP',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Pancetta',
          'Włoskie salami picante',
          'Gorgonzola DOP'
        ),
        36,
        51,
        { spicy: true }
      ),
      pizza(
        'Parma',
        'sos z włoskich pomidorów, mozzarella fior di latte, włoska szynka Crudo di Parma, świeża rukola, pomidorki koktajlowe, grana padano DOP',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Szynka Crudo di Parma',
          'Świeża rukola',
          'Pomidorki koktajlowe',
          'Grana Padano DOP'
        ),
        42,
        54
      ),
      pizza(
        'Rukola',
        'sos z włoskich pomidorów, mozzarella fior di latte, pieczarki, oliwki czarne, świeża rukola, włoska szynka Crudo di Parma',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Pieczarki',
          'Oliwki czarne',
          'Świeża rukola',
          'Szynka Crudo di Parma'
        ),
        42,
        54
      ),
      pizza(
        'House',
        'sos z włoskich pomidorów, mozzarella fior di latte, grillowany kurczak, Pancetta, cebula czerwona, pieczarki',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Grillowany kurczak',
          'Pancetta',
          'Cebula czerwona',
          'Pieczarki'
        ),
        35,
        50
      ),
      pizza(
        'Diavola',
        'sos z włoskich pomidorów, mozzarella fior di latte, włoskie salami picante, Gorgonzola DOP, suszony pomidor',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Włoskie salami picante',
          'Gorgonzola DOP',
          'Suszony pomidor'
        ),
        37,
        52,
        { spicy: true }
      ),
      pizza(
        'Polacco',
        'sos z włoskich pomidorów, mozzarella fior di latte, szynka Prosciutto Cotto, łagodne salami Napoli, Pancetta, grillowana papryka',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Szynka Prosciutto Cotto',
          'Łagodne salami Napoli',
          'Pancetta',
          'Grillowana papryka'
        ),
        42,
        56
      ),
      pizza(
        'Vegetariana',
        'sos z włoskich pomidorów, mozzarella fior di latte, grillowane warzywa, pieczarki, bułka tarta, szczypiorek, czosnek, pesto bazyliowe',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Grillowane warzywa',
          'Pieczarki',
          'Bułka tarta',
          'Szczypiorek',
          'Czosnek',
          'Pesto bazyliowe'
        ),
        37,
        49
      ),
      pizza(
        "N'Duja",
        "sos z włoskich pomidorów, mozzarella fior di latte, N'duja, szpinak marynowany w oliwie czosnkowej, papryka jalapeño, Grana Padano DOP",
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          "N'duja",
          'Szpinak w oliwie czosnkowej',
          'Papryka jalapeño',
          'Grana Padano DOP'
        ),
        40,
        54,
        { spicy: true }
      ),
      pizza(
        'Forno',
        "sos z włoskich pomidorów, mozzarella fior di latte, włoskie salami picante, N'duja, suszony pomidor, papryka jalapeño",
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Włoskie salami picante',
          "N'duja",
          'Suszony pomidor',
          'Papryka jalapeño'
        ),
        40,
        54,
        { spicy: true }
      ),
      pizza(
        'Prosciutto e Pollo',
        'sos z włoskich pomidorów, mozzarella fior di latte, szynka Prosciutto Cotto, grillowany kurczak, kukurydza, papryka jalapeño',
        ings(
          'Sos z włoskich pomidorów',
          'Mozzarella fior di latte',
          'Szynka Prosciutto Cotto',
          'Grillowany kurczak',
          'Kukurydza',
          'Papryka jalapeño'
        ),
        36,
        50,
        { spicy: true }
      ),
      pizza(
        'Pizza Italiana',
        'Pizza w kolorach flagi Włoch — czerwona: sos pomidorowy, mozzarella, salami picante, suszony pomidor · biała: sos śmietanowy, mozzarella, camembert, orzechy · zielona: pesto, mozzarella, cukinia, pietruszka',
        ings(
          'Sos z włoskich pomidorów',
          'Sos śmietanowy',
          'Pesto bazyliowe',
          'Mozzarella fior di latte',
          'Salami picante',
          'Suszony pomidor',
          'Camembert',
          'Orzechy włoskie',
          'Cukinia',
          'Pietruszka'
        ),
        42,
        56,
        { note: 'Polecana' }
      )
    ]
  },
  {
    title: 'Pizza Bianca',
    foods: [
      pizza(
        'Pesto',
        'sos kremowy, mozzarella fior di latte, grana padano, pomidorki koktajlowe, orzechy włoskie, pesto bazyliowe',
        ings(
          'Sos kremowy',
          'Mozzarella fior di latte',
          'Grana Padano',
          'Pomidorki koktajlowe',
          'Orzechy włoskie',
          'Pesto bazyliowe'
        ),
        36,
        50
      ),
      pizza(
        'Fungie',
        'sos kremowy, mozzarella fior di latte, mix grzybów: borowiki, kurki, pieczarki, czerwona cebula, oliwa truflowa, pietruszka',
        ings(
          'Sos kremowy',
          'Mozzarella fior di latte',
          'Borowiki',
          'Kurki',
          'Pieczarki',
          'Czerwona cebula',
          'Oliwa truflowa',
          'Pietruszka'
        ),
        38,
        50
      ),
      pizza(
        'Porcino',
        'sos kremowy, mozzarella fior di latte, włoskie salami picante, mix grzybów, szczypiorek, grana padano DOP',
        ings(
          'Sos kremowy',
          'Mozzarella fior di latte',
          'Włoskie salami picante',
          'Mix grzybów',
          'Szczypiorek',
          'Grana Padano DOP'
        ),
        38,
        50,
        { spicy: true }
      ),
      pizza(
        'Spinaci e Pollo',
        'sos kremowy, mozzarella fior di latte, grillowany kurczak, szpinak marynowany w oliwie czosnkowej, grana padano DOP',
        ings(
          'Sos kremowy',
          'Mozzarella fior di latte',
          'Grillowany kurczak',
          'Szpinak w oliwie czosnkowej',
          'Grana Padano DOP'
        ),
        38,
        52
      )
    ]
  },
  {
    title: 'Sałatka',
    foods: [
      salad(
        'Sałatka Pollo',
        'sałata lodowa, grillowany kurczak, świeży pomidor, ogórek zielony, czerwona cebula, kukurydza, szczypiorek, sos czosnkowy',
        ings(
          'Sałata lodowa',
          'Grillowany kurczak',
          'Świeży pomidor',
          'Ogórek zielony',
          'Czerwona cebula',
          'Kukurydza',
          'Szczypiorek',
          'Sos czosnkowy'
        ),
        26,
        32,
        { note: 'Do wyboru pieczywko na sosie pomidorowym z czarnuszką lub z oliwą czosnkową' }
      ),
      salad(
        'Sałatka Parma',
        'sałata lodowa, rukola, gruszka, włoska szynka Crudo di Parma, Gorgonzola DOP, orzech włoski, pomidorki koktajlowe, sos musztardowo-miodowy',
        ings(
          'Sałata lodowa',
          'Rukola',
          'Gruszka',
          'Szynka Crudo di Parma',
          'Gorgonzola DOP',
          'Orzech włoski',
          'Pomidorki koktajlowe',
          'Sos musztardowo-miodowy'
        ),
        30,
        36
      ),
      salad(
        'Sałatka Feta',
        'sałata lodowa, grillowana papryka, czerwona cebula, ogórek zielony, ser feta, pomidorki koktajlowe, prażony słonecznik, pesto bazyliowe',
        ings(
          'Sałata lodowa',
          'Grillowana papryka',
          'Czerwona cebula',
          'Ogórek zielony',
          'Ser feta',
          'Pomidorki koktajlowe',
          'Prażony słonecznik',
          'Pesto bazyliowe'
        ),
        29,
        34
      ),
      salad(
        'Sałatka Bekon',
        'sałata lodowa, domowe ogórki curry, grillowana papryka, kukurydza, czerwona cebula, bekon, szczypiorek, sos czosnkowy',
        ings(
          'Sałata lodowa',
          'Ogórki curry',
          'Grillowana papryka',
          'Kukurydza',
          'Czerwona cebula',
          'Bekon',
          'Szczypiorek',
          'Sos czosnkowy'
        ),
        31,
        39
      ),
      salad(
        'Sałatka na ostro',
        'sałata lodowa, grillowany kurczak, papryka jalapeño, suszony pomidor, czerwona cebula, świeży pomidor, zielony ogórek, szczypiorek, sos chili mayo',
        ings(
          'Sałata lodowa',
          'Grillowany kurczak',
          'Papryka jalapeño',
          'Suszony pomidor',
          'Czerwona cebula',
          'Świeży pomidor',
          'Zielony ogórek',
          'Szczypiorek',
          'Sos chili mayo'
        ),
        29,
        36,
        { spicy: true }
      ),
      salad(
        'Sałatka Fitness',
        'bez pieczywka — sałata lodowa, sos jogurtowo-koperkowy, świeży pomidor, ogórek curry, marchewka, cebula czerwona, grillowany kurczak, grzanki, Grana Padano DOP',
        ings(
          'Sałata lodowa',
          'Sos jogurtowo-koperkowy',
          'Świeży pomidor',
          'Ogórek curry',
          'Marchewka',
          'Cebula czerwona',
          'Grillowany kurczak',
          'Grzanki',
          'Grana Padano DOP'
        ),
        26,
        32,
        { note: 'Bez pieczywka' }
      ),
      salad(
        'Sałatka z chrupiącym kurczakiem',
        'sałata lodowa, kurczak w złocistej panierce, świeży pomidor, ogórek zielony, czerwona cebula, kukurydza, szczypiorek, sos czosnkowy',
        ings(
          'Sałata lodowa',
          'Kurczak w panierce',
          'Świeży pomidor',
          'Ogórek zielony',
          'Czerwona cebula',
          'Kukurydza',
          'Szczypiorek',
          'Sos czosnkowy'
        ),
        29,
        35
      )
    ]
  },
  {
    title: 'Calzone',
    foods: [
      simple(
        'Capri',
        'Pizza zawijana — mozzarella fior di latte, szynka Prosciutto Cotto, pieczarki, czosnek, świeża rukola, grana padano DOP, oliwa czosnkowa',
        ings(
          'Mozzarella fior di latte',
          'Szynka Prosciutto Cotto',
          'Pieczarki',
          'Czosnek',
          'Świeża rukola',
          'Grana Padano DOP',
          'Oliwa czosnkowa'
        ),
        36,
        IMG.calzone
      ),
      simple(
        'Inferno',
        'Pizza zawijana — sos pomidorowy, mozzarella fior di latte, włoskie salami picante, smażona cebula, Grana Padano DOP, oliwa chili',
        ings(
          'Sos pomidorowy',
          'Mozzarella fior di latte',
          'Włoskie salami picante',
          'Smażona cebula',
          'Grana Padano DOP',
          'Oliwa chili'
        ),
        36,
        IMG.calzone,
        { spicy: true }
      )
    ]
  },
  {
    title: 'Buła',
    foods: [
      simple(
        'Buła z szarpaną wieprzowiną',
        'nasza buła, szarpana wieprzowina pieczona 12 godzin, colesław, pomidor, ogórek, czerwona cebula, szczypiorek, sosy do wyboru (polecamy BBQ Mississippi)',
        ings(
          'Buła',
          'Szarpana wieprzowina',
          'Colesław',
          'Pomidor',
          'Ogórek',
          'Czerwona cebula',
          'Szczypiorek',
          'Sos BBQ Mississippi'
        ),
        33,
        IMG.bun
      )
    ]
  },
  {
    title: 'Pieczywo',
    foods: [
      simple(
        'Pieczywko na sosie pomidorowym z czarnuszką',
        'Pieczywko na sosie pomidorowym z czarnuszką',
        ings('Pieczywo', 'Sos pomidorowy', 'Czarnuszka'),
        12,
        IMG.bread
      ),
      simple(
        'Pieczywko z oliwą czosnkową',
        'Pieczywko z oliwą czosnkową',
        ings('Pieczywo', 'Oliwa czosnkowa'),
        12,
        IMG.bread
      ),
      simple(
        'Pieczywko na sosie pomidorowym bez czarnuszki',
        'Pieczywko na sosie pomidorowym bez czarnuszki',
        ings('Pieczywo', 'Sos pomidorowy'),
        12,
        IMG.bread
      )
    ]
  },
  {
    title: 'Przystawki',
    foods: [
      simple(
        'Krem z włoskich pomidorów',
        'Krem z włoskich pomidorów',
        ings('Włoskie pomidory'),
        17,
        IMG.starter
      ),
      simple(
        'Nachosy z sosem serowym i słodkim chili',
        'Nachosy z sosem serowym i słodkim chili',
        ings('Nachosy', 'Sos serowy', 'Słodkie chili'),
        20,
        IMG.starter
      )
    ]
  },
  {
    title: 'Napoje',
    foods: [
      simple('Pepsi 0,5 l', '0,5 l', ings('Pepsi'), 12, IMG.drink),
      simple('Pepsi Max 0,5 l', '0,5 l', ings('Pepsi Max'), 12, IMG.drink),
      simple('Mirinda 0,5 l', '0,5 l', ings('Mirinda'), 12, IMG.drink),
      simple('7up 0,5 l', '0,5 l', ings('7up'), 12, IMG.drink),
      simple('Lipton Lemon 0,5 l', '0,5 l', ings('Lipton Lemon'), 12, IMG.drink),
      simple('Lipton Green 0,5 l', '0,5 l', ings('Lipton Green'), 12, IMG.drink),
      simple('Lipton Peach 0,5 l', '0,5 l', ings('Lipton Peach'), 12, IMG.drink),
      simple('Sok Toma Jabłkowy 0,3 l', '0,3 l', ings('Sok jabłkowy'), 8, IMG.drink),
      simple('Sok Toma Pomarańczowy 0,3 l', '0,3 l', ings('Sok pomarańczowy'), 8, IMG.drink),
      simple('Woda', 'Woda', ings('Woda'), 10, IMG.drink),
      simple('Pepsi puszka 0,3 l', '0,3 l', ings('Pepsi'), 8, IMG.drink)
    ]
  },
  {
    title: 'Sosy',
    foods: [
      simple('Czosnkowy', 'Sos czosnkowy', ings('Sos czosnkowy'), 3, IMG.sauce),
      simple('Chilli-Mayo', 'Sos chilli-mayo', ings('Chilli-mayo'), 3, IMG.sauce, {
        spicy: true
      }),
      simple('Musztardowo-Miodowy', 'Sos musztardowo-miodowy', ings('Sos musztardowo-miodowy'), 3, IMG.sauce),
      simple('Ketchup', 'Ketchup', ings('Ketchup'), 3, IMG.sauce),
      simple('Pesto Bazyliowe', 'Pesto bazyliowe', ings('Pesto bazyliowe'), 4, IMG.sauce),
      simple('BBQ Mississippi', 'Sos BBQ Mississippi', ings('BBQ Mississippi'), 3, IMG.sauce),
      simple('Koperkowo-Jogurtowy', 'Sos koperkowo-jogurtowy', ings('Sos koperkowo-jogurtowy'), 3, IMG.sauce),
      simple('Oliwa Chilli', 'Oliwa chilli', ings('Oliwa chilli'), 5, IMG.sauce, { spicy: true }),
      simple('Oliwa Zwykła', 'Oliwa zwykła', ings('Oliwa'), 5, IMG.sauce),
      simple('Sos pomidorowy', 'Sos pomidorowy', ings('Sos pomidorowy'), 3, IMG.sauce),
      simple('Oliwa czosnkowa', 'Oliwa czosnkowa', ings('Oliwa czosnkowa'), 5, IMG.sauce)
    ]
  }
]

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/jedzto', {
    serverSelectionTimeoutMS: 8000
  })

  const restaurant = await Restaurant.findOne({ name: RESTAURANT_NAME })
  if (!restaurant) {
    throw new Error(`Restaurant "${RESTAURANT_NAME}" not found`)
  }
  const restaurantId = restaurant._id

  const oldCats = await Category.find({ restaurantId }).select('_id').lean()
  const oldCatIds = oldCats.map((c) => c._id)
  const delFoods = await Food.deleteMany({ restaurantId })
  const delCats = await Category.deleteMany({ restaurantId })
  console.log(
    `[italiana] cleared foods=${delFoods.deletedCount} categories=${delCats.deletedCount} (ids=${oldCatIds.length})`
  )

  let foodCount = 0
  for (const cat of MENU) {
    const category = await Category.create({
      restaurantId,
      title: cat.title
    })
    for (const item of cat.foods) {
      await Food.create({
        restaurantId,
        categoryId: category._id,
        title: item.title,
        description: item.description,
        image: item.image,
        price: item.variations[0].price,
        ingredients: item.ingredients,
        variations: item.variations,
        isActive: true
      })
      foodCount += 1
    }
    console.log(`[italiana] ${cat.title}: ${cat.foods.length} items`)
  }

  await publishRestaurantMenu(restaurantId)
  console.log(`[italiana] published menu — ${MENU.length} categories, ${foodCount} foods`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
