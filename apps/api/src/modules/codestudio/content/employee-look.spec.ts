import { employeeAvatar, employeeStyle, isCheerful, type WardrobeItem } from './employee-look';

const item = (id: string, slot: string, tags: string[], extra: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id,
  slot,
  tags,
  imageUrl: `${id}.png`,
  layer: 1,
  colorable: true,
  isDefault: false,
  wear: true,
  sprites: [],
  ...extra,
});

const wardrobe: WardrobeItem[] = [
  item('body', 'BODY', [], { isDefault: true, wear: false }),
  item('dress', 'SHIRT', ['gender:female', 'style:elegant']),
  item('suit', 'SHIRT', ['gender:male', 'style:elegant']),
  item('tee', 'SHIRT', ['style:casual']),
  item('hair', 'HAIR', []),
];

describe('employeeAvatar', () => {
  it('nadie usa ropa del otro género', () => {
    for (let index = 0; index < 40; index++) {
      const woman = employeeAvatar(`w${index}`, wardrobe, 'FEMALE')!;
      const man = employeeAvatar(`m${index}`, wardrobe, 'MALE')!;
      expect(woman.slots.find((slot) => slot.slot === 'SHIRT')?.itemId).not.toBe('suit');
      expect(man.slots.find((slot) => slot.slot === 'SHIRT')?.itemId).not.toBe('dress');
    }
  });

  it('se viste según su estilo', () => {
    for (let index = 0; index < 40; index++) {
      const id = `e${index}`;
      const style = employeeStyle(id, wardrobe, 'MALE');
      const shirt = employeeAvatar(id, wardrobe, 'MALE')!.slots.find((slot) => slot.slot === 'SHIRT')?.itemId;
      expect(shirt).toBe(style === 'elegant' ? 'suit' : 'tee');
    }
  });

  it('pocos son "alegres" y el resto tiene pelo natural', () => {
    const cheerful = Array.from({ length: 400 }, (_, index) => isCheerful(`p${index}`)).filter(Boolean).length;
    expect(cheerful).toBeGreaterThan(20);
    expect(cheerful).toBeLessThan(90);
  });

  it('siempre igual para la misma persona', () => {
    expect(employeeAvatar('x', wardrobe, 'FEMALE')).toEqual(employeeAvatar('x', wardrobe, 'FEMALE'));
  });
});
