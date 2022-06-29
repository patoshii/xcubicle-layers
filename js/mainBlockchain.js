const REQUEST_TYPE = {
	"searchTaggedData" : "searchTaggedData",
	"getTaggedData" : "getTaggedData",
	"uploadTaggedData": "uploadTaggedData"
}

const paramsToString = params => {
	let param ="";
	for(let key in params) { 
		param  +=`&${key}=${params[key]}`
	}
	return param;
}

const parseGetTaggedDataUrl = (node, type, data={}) => {
	if(typeof data != 'object') throw 'Invalid data type to parse getTaggedData reuquest.';
	let params = {};

	if(data.hasOwnProperty('transaction')) {
		params.transaction = data.transaction;
	} 

	if (data.hasOwnProperty('transactionFullHash')){
		params.transactionFullHash = data.transactionFullHash;
	}

	if(data.hasOwnProperty('chain')) {
		params.chain = data.chain;
	}

	return `${node}/nxt?requestType=${type}${paramsToString(params)}`;
}


class MainBlockchain { 
	constructor(node) { 
		this.node = node;
	}

	static requestUrl(node, type, params={}) {
		if(!REQUEST_TYPE[type]) throw "Invalid Request Type";
		
		let param = paramsToString(params);

		switch(type) {
			case 'getTaggedData':
				return parseGetTaggedDataUrl(node,type, params);
			case REQUEST_TYPE[type]:
				return `${node}/nxt?requestType=${type}${param}`;
		}
	} 
	
} 

const mainBlockchain = (node) => {
	if(typeof node !== 'string') throw 'Please provide the correct blockchain URL';

	return new MainBlockchain(node);
}

// (await mainBLockchain('Written, 'https://mynode.com')).requestUrl('test', {});