'use client'

import React, { useState, useEffect } from 'react'
import axios from 'axios'

import mapboxgl, { Map, Marker } from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

const MAPBOX_TOKEN = '' // Insert your secret or process.env.MAPBOX_TOKEN as string

mapboxgl.accessToken = MAPBOX_TOKEN

const MOCKAPI = '' // Insert your secret process.env.MOCKAPI as string

interface MarkerData {
	id: number
	lng: number
	lat: number
	name: string
	description: string
}

interface ModalData {
	id?: number
	lng: number
	lat: number
	name: string
	description: string
}

const DeleteConfirmationModal: React.FC<{
	isOpen: boolean
	onCancel: () => void
	onConfirm: () => void
}> = ({ isOpen, onCancel, onConfirm }) => {
	if (!isOpen) return null

	return (
		<div className='fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center'>
			<div className='bg-white p-4 rounded shadow-md'>
				<p className='mb-4'>Are you sure you want to delete this item?</p>
				<div className='flex justify-end'>
					<Stack spacing={2} direction='row'>
						<Button variant='contained' onClick={onConfirm}>
							Delete
						</Button>
						<Button variant='contained' onClick={onCancel}>
							Cancel
						</Button>
					</Stack>
				</div>
			</div>
		</div>
	)
}

const MapPage: React.FC = () => {
	const [map, setMap] = useState<Map | null>(null)
	const [markers, setMarkers] = useState<MarkerData[]>([])
	const [markerRefs, setMarkerRefs] = useState<{ [key: number]: Marker }>({})
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
	const [modalData, setModalData] = useState<ModalData>({
		lng: 0,
		lat: 0,
		name: '',
		description: '',
	})
	const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
	const [deleteItemId, setDeleteItemId] = useState<number | null>(null)

	useEffect(() => {
		const initializeMap = () => {
			const newMap = new mapboxgl.Map({
				container: 'map-container',
				style: 'mapbox://styles/mapbox/streets-v11',
				center: [0, 0],
				zoom: 1,
			})

			newMap.on('dblclick', e => {
				const { lng, lat } = e.lngLat
				setModalData(prevData => ({ ...prevData, lng, lat }))
				setIsModalOpen(true)
			})

			setMap(newMap)
		}

		if (!map) {
			initializeMap()
		}
	}, [map])

	useEffect(() => {
		axios
			.get(MOCKAPI)
			.then(response => {
				setMarkers(
					response.data.map((marker: any) => ({
						id: marker.id,
						lng: parseFloat(marker.lng),
						lat: parseFloat(marker.lat),
						name: marker.name,
						description: marker.description,
					})),
				)
			})
			.catch(error => {
				console.error('Error fetching bookmark data:', error)
			})
	}, [])

	useEffect(() => {
		if (map) {
			const newMarkerRefs: { [key: number]: Marker } = {}
			markers.forEach(marker => {
				const el = document.createElement('div')
				el.className = 'marker'
				el.style.backgroundImage = 'url(/marker.png)'
				el.style.width = '24px'
				el.style.height = '24px'
				el.addEventListener('click', () => {
					map.flyTo({ center: [marker.lng, marker.lat], zoom: 24 })
				})

				const newMarker = new mapboxgl.Marker(el)
					.setLngLat([marker.lng, marker.lat])
					.addTo(map)
				newMarkerRefs[marker.id] = newMarker
			})
			setMarkerRefs(newMarkerRefs)
		}
	}, [map, markers])

	const handleModalSubmit = () => {
		if (modalData.id) {
			setMarkers(prevMarkers =>
				prevMarkers.map(marker =>
					marker.id === modalData.id ? { ...modalData } : marker,
				),
			)
		} else {
			const newMarker = {
				id: markers.length + 1,
				...modalData,
			}
			setMarkers(prevMarkers => [...prevMarkers, newMarker])
		}
		setIsModalOpen(false)
		setModalData({ lng: 0, lat: 0, name: '', description: '' })
	}

	const handleEdit = (marker: MarkerData) => {
		setModalData(marker)
		setIsModalOpen(true)
	}

	const handleDelete = (id: number) => {
		setDeleteItemId(id)
		setDeleteModalOpen(true)
	}

	const handleConfirmDelete = () => {
		const markerToRemove = markerRefs[deleteItemId]
		if (markerToRemove) {
			markerToRemove.remove()
		}

		setMarkers(prevMarkers =>
			prevMarkers.filter(marker => marker.id !== deleteItemId),
		)
		setDeleteModalOpen(false)
	}

	const handleCancelDelete = () => {
		setDeleteModalOpen(false)
		setDeleteItemId(null)
	}

	useEffect(() => {
		if (
			!map ||
			document.getElementById('geocoder-container').childNodes.length > 0
		)
			return

		const geocoder = new MapboxGeocoder({
			accessToken: mapboxgl.accessToken,
			mapboxgl: mapboxgl,
		})

		const geocoderContainer = document.getElementById('geocoder-container')
		if (geocoderContainer) {
			geocoderContainer.appendChild(geocoder.onAdd(map))
		}
	}, [map])

	return (
		<div className='flex h-screen'>
			<div className='w-1/3 bg-gray-50 p-4 pt-16'>
				<ul>
					{markers.map(marker => (
						<li key={marker.id} className='pt-4'>
							<button
								onClick={() =>
									map &&
									map.flyTo({ center: [marker.lng, marker.lat], zoom: 14 })
								}
							>
								<div className='font-bold text-left'>{marker.name}</div>
								<div className='text-left'>{marker.description}</div>
							</button>
							<Stack spacing={2} direction='row'>
								<Button
									variant='contained'
									onClick={() => handleEdit(marker)}
									className='ml-2'
								>
									Edit
								</Button>
								<Button
									variant='contained'
									onClick={() => handleDelete(marker.id)}
									className='ml-2'
								>
									Delete
								</Button>
							</Stack>
						</li>
					))}
				</ul>
			</div>

			<div
				id='geocoder-container'
				className='absolute top-0 left-0 p-4 z-10'
			></div>

			<div className='w-2/3'>
				<div id='map-container' className='h-screen'></div>
			</div>

			{isModalOpen && (
				<div className='fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center'>
					<div className='bg-white p-4 rounded shadow-md'>
						<div className='mb-4'>
							<label htmlFor='name' className='block mb-1'>
								Name:
							</label>
							<input
								type='text'
								id='name'
								value={modalData.name}
								onChange={e =>
									setModalData({ ...modalData, name: e.target.value })
								}
								className='w-full border border-gray-300 rounded p-2'
							/>
						</div>
						<div className='mb-4'>
							<label htmlFor='description' className='block mb-1'>
								Description:
							</label>
							<textarea
								id='description'
								value={modalData.description}
								onChange={e =>
									setModalData({ ...modalData, description: e.target.value })
								}
								className='w-full border border-gray-300 rounded p-2'
							></textarea>
						</div>
						<div className='flex justify-end'>
							<Stack spacing={2} direction='row'>
								<Button variant='contained' onClick={handleModalSubmit}>
									Save
								</Button>
								<Button
									variant='contained'
									onClick={() => setIsModalOpen(false)}
								>
									Cancel
								</Button>
							</Stack>
						</div>
					</div>
				</div>
			)}

			<DeleteConfirmationModal
				isOpen={deleteModalOpen}
				onCancel={handleCancelDelete}
				onConfirm={handleConfirmDelete}
			/>
		</div>
	)
}

export default MapPage
