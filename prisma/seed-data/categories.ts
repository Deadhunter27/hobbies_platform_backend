export interface CategorySeed {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export const categorySeeds: CategorySeed[] = [
  {
    slug: 'sports-and-movement',
    name: 'Sports & Movement',
    description: 'Hobbies built around physical activity and friendly competition.',
    sortOrder: 1,
  },
  {
    slug: 'creative-arts',
    name: 'Creative Arts',
    description: 'Hands-on, expressive hobbies — making something with your hands or eyes.',
    sortOrder: 2,
  },
  {
    slug: 'outdoors-and-nature',
    name: 'Outdoors & Nature',
    description: 'Hobbies centered on being outside and exploring the natural world.',
    sortOrder: 3,
  },
];
