/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsComposeOpenPgpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsComposeOpenPgp');

	this.notification = ko.observable('');

	this.sign = ko.observable(true);
	this.encrypt = ko.observable(true);

	this.password = ko.observable('');
	this.password.focus = ko.observable(false);
	this.buttonFocus = ko.observable(false);

	this.from = ko.observable('');
	this.to = ko.observableArray([]);
	this.text = ko.observable('');

	this.resultCallback = null;
	
	this.submitRequest = ko.observable(false);

	// commands
	this.doCommand = Utils.createCommand(this, function () {

		var
			self = this,
			bResult = true,
			oData = RL.data(),
			oPrivateKey = null,
			aPublicKeys = []
		;

		this.submitRequest(true);

		if (bResult && this.sign() && '' === this.from())
		{
			this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_FROM_EMAIL'));
			bResult = false;
		}

		if (bResult && this.sign())
		{
			oPrivateKey = oData.findPrivateKeyByEmail(this.from(), this.password());
			if (!oPrivateKey)
			{
				this.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
					'EMAIL': this.from()
				}));
				
				bResult = false;
			}
		}

		if (bResult && this.encrypt() && 0 === this.to().length)
		{
			this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_AT_LEAST_ONE_RECIPIENT'));
			bResult = false;
		}

		if (bResult && this.encrypt())
		{
			aPublicKeys = [];
			_.each(this.to(), function (sEmail) {
				var aKeys = oData.findPublicKeysByEmail(sEmail);
				if (0 === aKeys.length && bResult)
				{
					self.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
						'EMAIL': sEmail
					}));
					
					bResult = false;
				}

				aPublicKeys = aPublicKeys.concat(aKeys);
			});
			
			if (bResult && (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length))
			{
				bResult = false;
			}
		}

		_.delay(function () {

			if (self.resultCallback && bResult)
			{
				try {

					if (oPrivateKey && 0 === aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signClearMessage([oPrivateKey], self.text())
						);
					}
					else if (oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text())
						);
					}
					else if (!oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.encryptMessage(aPublicKeys, self.text())
						);
					}
				}
				catch (e)
				{
					self.notification(Utils.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
						'ERROR': '' + e
					}));

					bResult = false;
				}
			}

			if (bResult)
			{
				self.cancelCommand();
			}

			self.submitRequest(false);

		}, 10);

	}, function () {
		return !this.submitRequest() &&	(this.sign() || this.encrypt());
	});

	this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeOpenPgpViewModel', PopupsComposeOpenPgpViewModel);

PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
{
	this.notification('');

	this.password('');
	this.password.focus(false);
	this.buttonFocus(false);

	this.from('');
	this.to([]);
	this.text('');

	this.submitRequest(false);

	this.resultCallback = null;
};

PopupsComposeOpenPgpViewModel.prototype.onBuild = function ()
{
	key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function () {

		switch (true)
		{
			case this.password.focus():
				this.buttonFocus(true);
				break;
			case this.buttonFocus():
				this.password.focus(true);
				break;
		}

		return false;
		
	}, this));
};

PopupsComposeOpenPgpViewModel.prototype.onHide = function ()
{
	this.clearPopup();
};

PopupsComposeOpenPgpViewModel.prototype.onFocus = function ()
{
	if (this.sign())
	{
		this.password.focus(true);
	}
	else
	{
		this.buttonFocus(true);
	}
};

PopupsComposeOpenPgpViewModel.prototype.onShow = function (fCallback, sText, sFromEmail, sTo, sCc, sBcc)
{
	this.clearPopup();

	var
		oEmail = new EmailModel(),
		sResultFromEmail = '',
		aRec = []
	;

	this.resultCallback = fCallback;

	oEmail.clear();
	oEmail.mailsoParse(sFromEmail);
	if ('' !== oEmail.email)
	{
		sResultFromEmail = oEmail.email;
	}

	if ('' !== sTo)
	{
		aRec.push(sTo);
	}
	
	if ('' !== sCc)
	{
		aRec.push(sCc);
	}

	if ('' !== sBcc)
	{
		aRec.push(sBcc);
	}

	aRec = aRec.join(', ').split(',');
	aRec = _.compact(_.map(aRec, function (sValue) {
		oEmail.clear();
		oEmail.mailsoParse(Utils.trim(sValue));
		return '' === oEmail.email ? false : oEmail.email;
	}));

	this.from(sResultFromEmail);
	this.to(aRec);
	this.text(sText);
};
