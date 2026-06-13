import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { GetProductsDto } from './dto/get-products.dto';

export interface ProductPage {
  items: Product[];
  nextCursor: number | null;
  hasMore: boolean;
  total: number;
}

const SEED_PRODUCTS = [
  {
    name: 'Wireless Noise-Cancelling Headphones',
    category: 'Electronics',
    price: 249.99,
    stock: 42,
    description:
      'Premium over-ear headphones with active noise cancellation and 30-hour battery life.',
  },
  {
    name: 'Mechanical Keyboard',
    category: 'Electronics',
    price: 129.99,
    stock: 78,
    description:
      'Compact TKL mechanical keyboard with Cherry MX switches and RGB backlight.',
  },
  {
    name: 'Ergonomic Office Chair',
    category: 'Furniture',
    price: 399.0,
    stock: 15,
    description:
      'Fully adjustable mesh chair with lumbar support and headrest for all-day comfort.',
  },
  {
    name: 'Standing Desk',
    category: 'Furniture',
    price: 549.0,
    stock: 8,
    description:
      'Electric height-adjustable standing desk, 140×70 cm oak top, memory presets.',
  },
  {
    name: 'USB-C Hub 7-in-1',
    category: 'Electronics',
    price: 49.99,
    stock: 120,
    description:
      'Expand your laptop with HDMI 4K, 3× USB-A, SD card reader, and 100W PD pass-through.',
  },
  {
    name: 'Webcam 4K',
    category: 'Electronics',
    price: 149.99,
    stock: 55,
    description:
      '4K 30fps webcam with auto-focus, built-in mic, and privacy shutter.',
  },
  {
    name: 'Yoga Mat',
    category: 'Sports',
    price: 39.99,
    stock: 200,
    description:
      'Non-slip 6mm thick yoga mat made from eco-friendly TPE, 183×61 cm.',
  },
  {
    name: 'Resistance Bands Set',
    category: 'Sports',
    price: 24.99,
    stock: 300,
    description:
      'Set of 5 resistance bands (10–50 lbs) with carry bag and door anchor.',
  },
  {
    name: 'Stainless Steel Water Bottle',
    category: 'Kitchen',
    price: 29.99,
    stock: 180,
    description: 'Vacuum-insulated 1L bottle keeps drinks cold 24h or hot 12h.',
  },
  {
    name: 'French Press Coffee Maker',
    category: 'Kitchen',
    price: 34.99,
    stock: 95,
    description:
      '1L borosilicate glass French press with stainless steel plunger.',
  },
  {
    name: 'Desk Lamp LED',
    category: 'Furniture',
    price: 59.99,
    stock: 70,
    description:
      'Adjustable LED desk lamp with USB charging port, 5 colour temperatures.',
  },
  {
    name: 'Bluetooth Speaker',
    category: 'Electronics',
    price: 89.99,
    stock: 60,
    description:
      'IPX7 waterproof portable speaker with 360° sound and 20h battery.',
  },
  {
    name: 'Smart Watch',
    category: 'Electronics',
    price: 299.99,
    stock: 35,
    description:
      'Fitness tracker with GPS, heart rate monitor, sleep tracking and 7-day battery.',
  },
  {
    name: 'Laptop Stand',
    category: 'Electronics',
    price: 44.99,
    stock: 140,
    description:
      'Adjustable aluminium laptop stand for 10–17" laptops, foldable and lightweight.',
  },
  {
    name: 'Cable Management Box',
    category: 'Furniture',
    price: 19.99,
    stock: 250,
    description:
      'Large cable organiser box hides power strips and excess cable length.',
  },
  {
    name: 'Plant Pot Set (3-pack)',
    category: 'Home',
    price: 32.99,
    stock: 110,
    description:
      'Set of 3 ceramic plant pots in white/grey/black, drainage hole included.',
  },
  {
    name: 'Aroma Diffuser',
    category: 'Home',
    price: 27.99,
    stock: 90,
    description:
      '500ml ultrasonic essential oil diffuser with 7-colour LED and timer.',
  },
  {
    name: 'Hiking Backpack 40L',
    category: 'Sports',
    price: 119.99,
    stock: 45,
    description:
      '40L hiking pack with hydration bladder sleeve, rain cover, and adjustable frame.',
  },
  {
    name: 'Running Shoes',
    category: 'Sports',
    price: 89.99,
    stock: 160,
    description:
      'Lightweight breathable mesh running shoes with cushioned sole, unisex sizing.',
  },
  {
    name: 'Skipping Rope',
    category: 'Sports',
    price: 14.99,
    stock: 400,
    description:
      'Speed jump rope with ball-bearing handles, adjustable length cable.',
  },
  {
    name: 'Cast Iron Skillet',
    category: 'Kitchen',
    price: 44.99,
    stock: 75,
    description: '25cm pre-seasoned cast iron skillet, oven safe to 260°C.',
  },
  {
    name: 'Digital Kitchen Scale',
    category: 'Kitchen',
    price: 17.99,
    stock: 320,
    description:
      'Precise 5kg kitchen scale with 1g graduation and tare function.',
  },
  {
    name: 'Sous Vide Cooker',
    category: 'Kitchen',
    price: 79.99,
    stock: 30,
    description:
      'Immersion circulator for precision sous vide cooking, 1200W, Wi-Fi enabled.',
  },
  {
    name: 'Wall Art Canvas Print',
    category: 'Home',
    price: 49.99,
    stock: 80,
    description:
      '60×40cm stretched canvas print, abstract geometric design, ready to hang.',
  },
  {
    name: 'Throw Blanket',
    category: 'Home',
    price: 39.99,
    stock: 130,
    description: 'Soft knitted 150×200cm throw blanket in 8 colour options.',
  },
  {
    name: 'Desk Organiser',
    category: 'Furniture',
    price: 22.99,
    stock: 200,
    description:
      'Bamboo desktop organiser with 6 compartments for pens, notes, and accessories.',
  },
  {
    name: 'Portable SSD 1TB',
    category: 'Electronics',
    price: 109.99,
    stock: 65,
    description:
      'USB 3.2 Gen 2 portable SSD, 1050 MB/s read speed, shock-resistant casing.',
  },
  {
    name: 'Monitor Light Bar',
    category: 'Electronics',
    price: 54.99,
    stock: 85,
    description:
      'Clip-on monitor light bar with asymmetric optical design to prevent screen glare.',
  },
  {
    name: 'Wireless Charging Pad',
    category: 'Electronics',
    price: 24.99,
    stock: 210,
    description:
      '15W Qi wireless charger, USB-C input, compatible with all Qi devices.',
  },
  {
    name: 'Smart Plug (4-pack)',
    category: 'Electronics',
    price: 34.99,
    stock: 175,
    description:
      'Wi-Fi smart plugs with energy monitoring, compatible with Alexa and Google Home.',
  },
  {
    name: 'Noise Machine',
    category: 'Home',
    price: 44.99,
    stock: 60,
    description:
      '20 non-looping natural sounds sleep machine with timer and night light.',
  },
  {
    name: 'Electric Kettle',
    category: 'Kitchen',
    price: 49.99,
    stock: 100,
    description:
      '1.7L variable temperature kettle, 60 min keep-warm, gooseneck spout.',
  },
  {
    name: 'Foam Roller',
    category: 'Sports',
    price: 22.99,
    stock: 220,
    description:
      '33cm high-density EVA foam roller for muscle recovery and myofascial release.',
  },
  {
    name: 'Reading Light',
    category: 'Home',
    price: 18.99,
    stock: 150,
    description:
      'Rechargeable clip-on book light, 3 brightness levels, 50h battery.',
  },
  {
    name: 'Travel Toiletry Bag',
    category: 'Home',
    price: 26.99,
    stock: 95,
    description:
      'Waterproof hanging toiletry organiser with clear pockets, 30×20cm.',
  },
  {
    name: 'Acrylic Paint Set',
    category: 'Art',
    price: 29.99,
    stock: 110,
    description:
      'Set of 24 acrylic colours, 75ml tubes, highly pigmented and quick-drying.',
  },
  {
    name: 'Sketch Pad A4',
    category: 'Art',
    price: 9.99,
    stock: 500,
    description:
      '100-sheet 160gsm acid-free sketch pad for pencil, charcoal, and ink.',
  },
  {
    name: 'Watercolour Set',
    category: 'Art',
    price: 19.99,
    stock: 140,
    description:
      '36 vibrant watercolour pans with brush, palette, and travel case.',
  },
  {
    name: 'Desk Calendar 2025',
    category: 'Furniture',
    price: 12.99,
    stock: 300,
    description:
      'Minimalist A5 desk calendar with weekly planning grid and notes section.',
  },
  {
    name: 'Notebook Set (3-pack)',
    category: 'Art',
    price: 16.99,
    stock: 380,
    description:
      'Set of 3 hardcover A5 notebooks, 192 pages each, dotted, lined, and blank.',
  },
  {
    name: 'Mechanical Pencil Set',
    category: 'Art',
    price: 11.99,
    stock: 250,
    description:
      '6-piece mechanical pencil set with 0.5mm leads and ergonomic grip.',
  },
  {
    name: 'Indoor Plant — Monstera',
    category: 'Home',
    price: 24.99,
    stock: 40,
    description:
      'Potted monstera deliciosa in 12cm terracotta pot, approx. 30cm tall.',
  },
  {
    name: 'Terrarium Kit',
    category: 'Home',
    price: 54.99,
    stock: 25,
    description:
      'Glass geometric terrarium with base, soil mix, and decoration stones.',
  },
  {
    name: 'Chess Set',
    category: 'Games',
    price: 44.99,
    stock: 55,
    description:
      'Weighted staunton chess pieces with folding wooden board, 38×38cm.',
  },
  {
    name: 'Playing Cards (2-pack)',
    category: 'Games',
    price: 12.99,
    stock: 600,
    description:
      'Two decks of premium plastic-coated playing cards with standard index.',
  },
  {
    name: 'Puzzle 1000 Pieces',
    category: 'Games',
    price: 19.99,
    stock: 90,
    description:
      '1000-piece jigsaw puzzle with impressionist landscape, 68×48cm assembled.',
  },
  {
    name: 'Compact Umbrella',
    category: 'Home',
    price: 21.99,
    stock: 180,
    description:
      'Auto open/close windproof compact umbrella, 23cm folded, UV coating.',
  },
  {
    name: 'Digital Photo Frame',
    category: 'Electronics',
    price: 74.99,
    stock: 45,
    description:
      '10.1" IPS digital photo frame with Wi-Fi, auto-rotate, and remote app.',
  },
  {
    name: 'Posture Corrector',
    category: 'Sports',
    price: 29.99,
    stock: 160,
    description:
      'Adjustable figure-8 clavicle brace for improved posture, unisex sizing.',
  },
  {
    name: 'Scented Candles (3-pack)',
    category: 'Home',
    price: 27.99,
    stock: 200,
    description:
      'Hand-poured soy wax candles in lavender, eucalyptus, and vanilla scents, 180g each.',
  },
];

@Injectable()
export class ProductsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      const products = SEED_PRODUCTS.map((p) => this.repo.create(p));
      await this.repo.save(products);
    }
  }

  async findPage(dto: GetProductsDto): Promise<ProductPage> {
    const limit = dto.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('p')
      .orderBy('p.id', 'ASC')
      .take(limit + 1); // fetch one extra to detect hasMore

    if (dto.cursor) {
      qb.where('p.id > :cursor', { cursor: dto.cursor });
    }

    const [items, total] = await Promise.all([qb.getMany(), this.repo.count()]);

    const hasMore = items.length > limit;
    if (hasMore) items.pop();

    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore, total };
  }
}
