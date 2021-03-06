import { SpellType } from "@shared/Spell";
import classNames from "classnames";
import React from "react";
import { connect } from "react-redux";
import { AssetManager } from "../../../../assetManager/AssetManager";
import { CharActionState } from "../../../../phaser/cycle/CycleManager";
import spriteCss from '../../../../_assets/spritesheets/spells_spritesheet.module.css';
import { UIState } from "../../../UIState";
import css from './timeOverlay.module.css';

interface TimeAction {
    spellType: SpellType;
    startDateTime: number;
    duration: number;
    state: CharActionState;
}

interface TimeOverlayInnerProps {
    startDateTime: number;
    turnDuration: number;
    timeActions: TimeAction[];
    disabled: boolean;
}

export const TimeOverlay = connect<TimeOverlayInnerProps, {}, {}, UIState<'battle'>>(
    ({ data: { battleData: { globalTurn } } }) => {
        if (!globalTurn) {
            return {
                startDateTime: 0,
                turnDuration: 0,
                timeActions: [],
                disabled: true
            };
        }
        
        const { currentTurn } = globalTurn;

        const { charActionStack } = currentTurn;

        const timeActions = charActionStack.reduce<TimeAction[]>((acc, ca) => {

            const previousCa = acc[acc.length - 1];
            if (
                previousCa
                && previousCa.spellType === 'move'
                && previousCa.spellType === ca.spell.staticData.type
                && ca.startTime - previousCa.startDateTime - previousCa.duration < 50
            ) {
                previousCa.duration += ca.spell.feature.duration;

            } else {
                acc.push({
                    spellType: ca.spell.staticData.type,
                    startDateTime: ca.startTime,
                    duration: ca.spell.feature.duration,
                    state: ca.state
                });

            }

            return acc;
        }, []);

        return {
            startDateTime: currentTurn.startTime,
            turnDuration: currentTurn.turnDuration,
            timeActions,
            disabled: !currentTurn.currentCharacter.isMine
        };
    }
)(({
    startDateTime,
    turnDuration,
    timeActions,
    disabled
}: TimeOverlayInnerProps) => {

    const itemsProps = timeActions.map<TimeOverlayItemProps>(ta => {

        const getHValue = (dateTime: number) => dateTime * 100 / turnDuration;

        const top = getHValue(ta.startDateTime - startDateTime);
        const height = getHValue(ta.duration);

        return {
            top,
            height,
            spellType: ta.spellType,
            state: ta.state
        };
    });


    return <div className={classNames(css.root, {
        [css.disabled]: disabled
    })}>

        {itemsProps.map(props => <TimeOverlayItem key={props.top} {...props} />)}

    </div>;
});

interface TimeOverlayItemProps {
    top: number;
    height: number;
    spellType: SpellType;
    state: CharActionState;
}

const TimeOverlayItem: React.FC<TimeOverlayItemProps> = ({
    top, height, spellType, state
}) => {

    const typeName = AssetManager.spells.spellsMap[spellType];

    return <div className={classNames(css.item, css[state])} style={{
        top: `${top}%`,
        height: `${height}%`,

    }}>

        <div className={css.itemLines} />

        <div className={classNames(spriteCss.sprite, spriteCss[typeName], css.spellSprite)} />

    </div>;
};
