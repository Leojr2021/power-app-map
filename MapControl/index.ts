/// <reference types="xrm" />

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export class MapControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private mapContainer: HTMLDivElement | undefined;
    private leafletMap: L.Map | undefined;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        // Create a DIV to hold the map
        this.mapContainer = document.createElement("div");
        this.mapContainer.style.width = "100%";
        this.mapContainer.style.height = "400px";
        container.appendChild(this.mapContainer);

        // Initialize Leaflet map if container is available
        if (this.mapContainer) {
            this.leafletMap = L.map(this.mapContainer).setView([0, 0], 2);

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
            }).addTo(this.leafletMap);
        }
    }

    public async updateView(context: ComponentFramework.Context<IInputs>): Promise<void> {
        // If we have no leafletMap yet, skip
        if (!this.leafletMap) {
            return;
        }

        // Remove any existing GeoJSON layers
        this.leafletMap.eachLayer((layer: L.Layer) => {
            if ((layer as L.GeoJSON).feature) {
                this.leafletMap!.removeLayer(layer);
            }
        });

        // Fetch and display new GeoJSON data
        const geoJsonRecords = await this.fetchGeoJsonFromDataverse("crb23_table11");

        geoJsonRecords.forEach((record: GeoJsonRecord) => {
            const geoJson = JSON.parse(record.GeoJSON);
            const zoneColor = record.zoneColor;

            L.geoJSON(geoJson, {
                style: () => ({
                    color: zoneColor || "#3388ff",
                }),
            }).addTo(this.leafletMap!);
        });

        // If any records came back, fit the map bounds around the first one
        if (geoJsonRecords.length > 0) {
            const firstGeoJson = JSON.parse(geoJsonRecords[0].GeoJSON);
            const bounds = L.geoJSON(firstGeoJson).getBounds();
            this.leafletMap.fitBounds(bounds);
        }
    }

    private async fetchGeoJsonFromDataverse(entityName: string): Promise<GeoJsonRecord[]> {
        const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
        const apiUrl = `${baseUrl}/api/data/v9.2/${entityName}`;

        try {
            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0",
                },
            });

            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }

            const data = await response.json();
            return data.value as GeoJsonRecord[];
        } catch (error) {
            console.error("Error fetching GeoJSON data from Dataverse:", error);
            return [];
        }
    }

    public destroy(): void {
        if (this.leafletMap) {
            this.leafletMap.remove();
        }
    }
}

interface GeoJsonRecord {
    GeoJSON: string;
    zoneColor: string;
}
