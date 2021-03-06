import { Position } from '@shared/Character';
import { Controller } from '../../../Controller';
import { BattleSpellLaunchAction } from '../../battleReducers/BattleReducerManager';
import { SpellLaunch, SpellResult } from '../SpellLaunch';

export type LaunchState = 'first' | 'middle' | 'last';

export class SpellLaunchMove extends SpellLaunch<'move'> {

    private timeline?: Phaser.Tweens.Timeline;

    async launch(targetPositions: Position[], state: LaunchState[]): Promise<SpellResult> {

        const [firstPos] = targetPositions;

        this.character.setPosition(firstPos, false, true, true);

        if (state.includes('first')) {
            this.onStart(targetPositions);
        }

        const isLast = state.includes('last');

        return new Promise<SpellResult>(resolve => {
            setTimeout(() => resolve({
                battleState: isLast,
                charState: isLast,
                grid: isLast
            }), this.spell.feature.duration);
        });
    }

    protected beforeCancel(): void {
        this.onEnd();
    }

    private onStart(targetPositions: Position[]): void {

        this.character.setCharacterState('move');

        const duration = this.spell.feature.duration;

        const tweens = targetPositions.map<Phaser.Types.Tweens.TweenBuilderConfig>((p, i) => {
            const pWorld = this.map.tileToWorldPosition(p);

            return {
                targets: this.character.getGraphics(),
                x: { value: pWorld.x, duration },
                y: { value: pWorld.y, duration },
                onStart: i
                    ? () => {
                        const nextPos = [p];

                        Controller.dispatch<BattleSpellLaunchAction>({
                            type: 'battle/spell/launch',
                            charAction: {
                                state: 'running',
                                startTime: Date.now(),
                                spell: this.spell,
                                duration: this.spell.feature.duration,
                                positions: nextPos
                            },
                            launchState: i < targetPositions.length - 1 ? ['last'] : ['middle']
                        });
                    }
                    : undefined
            };
        });

        this.timeline = this.scene.tweens.timeline({
            tweens,
            onComplete: () => this.onEnd()
        });
    }

    private onEnd(): void {
        this.timeline?.stop();
        delete this.timeline;

        this.character.characterGraphic.updatePosition();
    }
}