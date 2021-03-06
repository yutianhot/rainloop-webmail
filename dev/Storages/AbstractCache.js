/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AbstractCacheStorage()
{
	this.oEmailsPicsHashes = {};
	this.oServices = {};
	this.bAllowGravatar = !!RL.settingsGet('AllowGravatar');
}

/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oEmailsPicsHashes = {};

/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oServices = {};

/**
 * @type {boolean}
 */
AbstractCacheStorage.prototype.bAllowGravatar = false;

AbstractCacheStorage.prototype.clear = function ()
{
	this.oServices = {};
	this.oEmailsPicsHashes = {};
};

/**
 * @param {string} sEmail
 * @return {string}
 */
AbstractCacheStorage.prototype.getUserPic = function (sEmail, fCallback)
{
	sEmail = Utils.trim(sEmail);
	
	var
		sUrl = '',
		sService = '',
		sEmailLower = sEmail.toLowerCase(),
		sPicHash = Utils.isUnd(this.oEmailsPicsHashes[sEmailLower]) ? '' : this.oEmailsPicsHashes[sEmailLower]
	;

	if ('' !== sPicHash)
	{
		sUrl = RL.link().getUserPicUrlFromHash(sPicHash);
	}
	else
	{
		sService = sEmailLower.substr(sEmail.indexOf('@') + 1);
		sUrl = '' !== sService && this.oServices[sService] ? this.oServices[sService] : '';
	}

	
	if (this.bAllowGravatar && '' === sUrl)
	{
		fCallback('//secure.gravatar.com/avatar/' + Utils.md5(sEmailLower) + '.jpg?s=80&d=mm', sEmail);
	}
	else
	{
		fCallback(sUrl, sEmail);
	}
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setServicesData = function (oData)
{
	this.oServices = oData;
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setEmailsPicsHashesData = function (oData)
{
	this.oEmailsPicsHashes = oData;
};
