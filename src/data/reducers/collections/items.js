import _ from 'lodash-es'
import { normalizeCollections, findParentIds } from '../../helpers/collections'
import { updateCollections, actualizeStatus } from './utils'

import {REHYDRATE} from 'redux-persist/src/constants'

import {
	COLLECTIONS_LOAD_PRE, COLLECTIONS_LOAD_REQ, COLLECTIONS_LOAD_SUCCESS, COLLECTIONS_LOAD_ERROR,
	COLLECTIONS_REFRESH_REQ,
	COLLECTIONS_REORDER,
	COLLECTIONS_EXPAND_TO, COLLECTIONS_TOGGLE_ALL,
	COLLECTIONS_CLEAN_SUCCESS, COLLECTIONS_CLEAN_ERROR,
	COLLECTIONS_CHANGE_VIEW
} from '../../constants/collections'

export default function(state, action) {switch (action.type) {
	case REHYDRATE:{
		const { items, groups } = action.payload && action.payload.collections||{}

		if (typeof items == 'object')
			if (Object.keys(items).length>0)
				state = state.set('items', items)

		if (Array.isArray(groups))
			if (groups.length>0)
				state = state.set('groups', groups)

		return state
	}

	//Load
	case COLLECTIONS_LOAD_PRE:{
		if (state.status == 'loading')
			action.ignore = true

		return state
	}

	case COLLECTIONS_LOAD_REQ:{		
		return state
			.set('status', 'loading')
	}

	case COLLECTIONS_LOAD_SUCCESS:{
		if (typeof action.onSuccess == 'function')
			action.onSuccess()

		state = updateCollections(state, normalizeCollections(action.items, action.groups))
		state = state.set('status', 'loaded')
		state = state.set('fromCache', false)

		return actualizeStatus(state)
	}

	case COLLECTIONS_LOAD_ERROR:{
		if (typeof action.onFail == 'function')
			action.onFail(action.error)
		//state = updateCollections(state, normalizeCollections())

		return state
			.set('status', 'error')
	}

	//Refresh
	case COLLECTIONS_REFRESH_REQ:{
		if (state.status == 'loading'){
			action.ignore = true
			return state
		}

		return state
	}

	//Reorder all collections
	case COLLECTIONS_REORDER:{
		let items
		switch(action.method) {
			case 'title':
				items = _.sortBy(state.items, ({title})=>title.toLowerCase())
				state = state.set('groups', _.sortBy(state.groups, ({title})=>title.toLowerCase()))
			break;

			case 'count':
				items = _.sortBy(state.items, ({count})=>count).reverse()
			break;
		}

		items.forEach((item, i)=>
			state = state.setIn(['items', item._id, 'sort'], i)
		)

		state.groups.forEach(({collections}, groupIndex)=>{
			let ids = items
				.filter(({_id})=>collections.includes(_id))
				.map(({_id})=>parseInt(_id))

			state = state.setIn(
				['groups', groupIndex, 'collections'], 
				ids
			)
		})

		return state
	}

	case COLLECTIONS_EXPAND_TO:{
		const parents = findParentIds(state.items, action._id)

		if (action.self)
			parents.push(action._id)

		if (parents.length)
			parents.forEach(_id=>{
				state = state.setIn(['items', _id, 'expanded'], true)
			})

		return state
	}

	case COLLECTIONS_TOGGLE_ALL:{
		action.expanded = Object.entries(state.items).some(([_id])=>_id > 0 && !state.getIn(['items', _id, 'expanded']))
		return state
	}

	case COLLECTIONS_CHANGE_VIEW:{
		Object.entries(state.items).forEach(([_id])=>{
			state = state.setIn(['items', _id, 'view'], action.view)
		})

		Object.entries(state.defaults).forEach(([_id])=>{
			state = state.setIn(['defaults', _id, 'view'], action.view)
		})

		return state
	}

	case COLLECTIONS_CLEAN_SUCCESS:{
		if (typeof action.onSuccess == 'function')
			action.onSuccess(action.count||0)

		return state
	}

	case COLLECTIONS_CLEAN_ERROR:{
		if (typeof action.onFail == 'function')
			action.onFail(action.error)
			
		return state
	}
}}