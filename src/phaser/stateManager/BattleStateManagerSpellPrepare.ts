import { BattleStateManager, BattleStateData } from './BattleStateManager'
import { Position, Character } from '../entities/Character';
import { BattleScene, BattleData } from '../scenes/BattleScene';
import { Controller } from '../../Controller';
import { BattleStateAction } from '../battleReducers/BattleReducerManager';

export class BattleStateManagerSpellPrepare extends BattleStateManager<'spellPrepare'> {

    private characters: Character[];

    private readonly tilePositions: Position[];
    private readonly worldPositions: Position[];
    private readonly rects: Phaser.Geom.Rectangle[];

    private readonly line: Phaser.Geom.Line;

    private lastPositionHovered?: Position;
    private rectHoveredIndex: number;

    constructor(scene: BattleScene, battleData: BattleData, stateData: BattleStateData<'spellPrepare'>) {
        super(scene, battleData, stateData);
        this.characters = [];
        this.tilePositions = [];
        this.worldPositions = [];
        this.rects = [];
        this.line = new Phaser.Geom.Line();
        this.rectHoveredIndex = -1;
    }

    init(): void {
        this.tilePositions.length = 0;
        this.worldPositions.length = 0;
        this.rects.length = 0;

        const { map } = this.scene;

        const { spell } = this.stateData;
        const { zone } = spell;

        const character = this.battleData.currentCharacter!;
        const { position } = character;

        this.characters = this.battleData.characters.filter(c => c.name !== character.name);

        this.line.x1 = position.x;
        this.line.y1 = position.y;

        const tiles: Position[] = [];

        let sum = 0;
        for (let i = 0; i <= zone * 2; i++) {
            for (let k = 0; k <= (i - sum) * 2; k++) {

                const newPosition: Position = {
                    x: position.x - i + sum + k,
                    y: position.y - zone + i
                };

                this.line.x2 = newPosition.x;
                this.line.y2 = newPosition.y;

                const points = Phaser.Geom.Line.BresenhamPoints(this.line, 1) as Position[];

                let isTargetable = true;
                for (let i = 0; i < points.length; i++) {
                    const check = this.isPositionTargetable(points[ i ]);
                    if (check === 'no'
                        || check === 'last' && i < points.length - 1) {
                        isTargetable = false;
                        break;
                    }
                }

                if (isTargetable) {
                    tiles.push(newPosition);
                }
            }
            if (i >= zone) {
                sum += 2;
            }
        }

        this.tilePositions.push(...tiles);

        this.worldPositions.push(...tiles.map(p => map.tileToWorldPosition(p)));

        this.rects.push(...this.worldPositions
            .map(p => new Phaser.Geom.Rectangle(p.x, p.y,
                map.tilemap.tileWidth, map.tilemap.tileHeight)));
    }

    onTileHover(pointer: Phaser.Input.Pointer): void {
        const { map } = this.scene;

        const position = map.worldToTilePosition({
            x: pointer.worldX,
            y: pointer.worldY
        });

        if (this.lastPositionHovered?.x === position.x
            && this.lastPositionHovered?.y === position.y) {
            return;
        }
        this.lastPositionHovered = position;

        this.rectHoveredIndex = -1;

        this.rectHoveredIndex = this.tilePositions.findIndex(p => p.x === position.x && p.y === position.y);
        if (this.rectHoveredIndex === -1) {
            return;
        }
    }

    onTileClick(pointer: Phaser.Input.Pointer): void {
        if (this.rectHoveredIndex === -1) {
            Controller.dispatch<BattleStateAction>({
                type: 'battle/state',
                stateObject: {
                    state: 'idle'
                }
            });
            return;
        }

        const { spell } = this.stateData;

        Controller.dispatch<BattleStateAction>({
            type: 'battle/state',
            stateObject: {
                state: 'spellLaunch',
                data: {
                    spell,
                    position: this.lastPositionHovered!
                }
            }
        });
    }

    update(time: number, delta: number, graphics: Phaser.GameObjects.Graphics): void {

        graphics.fillStyle(0xFF0000, 0.5);
        graphics.lineStyle(2, 0x0000FF);

        this.rects.forEach((rect, i) => {
            if (this.rectHoveredIndex !== i)
                graphics.fillRectShape(rect);
            graphics.strokeRectShape(rect);
        });

        if (this.rectHoveredIndex !== -1) {
            graphics.fillStyle(0xFF0000, 0.8);
            graphics.fillRectShape(this.rects[ this.rectHoveredIndex ]);
        }

    }

    onTurnEnd(): void {
    }

    private isPositionTargetable = (position: Position): 'yes' | 'no' | 'last' => {
        const { map: { obstaclesLayer } } = this.scene;
        const { players } = this.battleData;

        if (obstaclesLayer.hasTileAt(position.x, position.y)) {
            return 'no';
        }

        const positions = this.characters.map(c => c.position);

        if (positions.some(p => p.x === position.x && p.y === position.y)) {
            return 'last';
        }

        return 'yes';
    };
}