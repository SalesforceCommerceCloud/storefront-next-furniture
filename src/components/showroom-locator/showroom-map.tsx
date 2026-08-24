/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import type { Showroom } from '@/components/showroom-locator/types';

type ShowroomMapProps = {
    apiKey: string;
    ariaLabel: string;
    selectedShowroomId: string | null;
    showrooms: Showroom[];
    onSelect: (showroomId: string) => void;
};

function SelectedShowroomController({ position }: { position?: { lat: number; lng: number } }) {
    const map = useMap();

    useEffect(() => {
        if (map && position) map.panTo(position);
    }, [map, position]);

    return null;
}

export default function ShowroomMap({ apiKey, ariaLabel, selectedShowroomId, showrooms, onSelect }: ShowroomMapProps) {
    const mappableShowrooms = showrooms.flatMap((showroom) =>
        typeof showroom.latitude === 'number' && typeof showroom.longitude === 'number'
            ? [{ showroom, position: { lat: showroom.latitude, lng: showroom.longitude } }]
            : []
    );
    const firstShowroom = mappableShowrooms[0];
    const selectedPosition = mappableShowrooms.find(({ showroom }) => showroom.id === selectedShowroomId)?.position;

    if (!firstShowroom) return null;

    return (
        <APIProvider apiKey={apiKey}>
            <Map
                aria-label={ariaLabel}
                className="h-[26rem] w-full"
                defaultCenter={firstShowroom.position}
                defaultZoom={9}
                gestureHandling="cooperative">
                <SelectedShowroomController position={selectedPosition} />
                {mappableShowrooms.map(({ showroom, position }) => (
                    <Marker
                        key={showroom.id}
                        position={position}
                        title={showroom.name ?? showroom.id}
                        label={showroom.id === selectedShowroomId ? (showroom.name ?? showroom.id) : undefined}
                        zIndex={showroom.id === selectedShowroomId ? 1 : 0}
                        onClick={() => onSelect(showroom.id)}
                    />
                ))}
            </Map>
        </APIProvider>
    );
}
