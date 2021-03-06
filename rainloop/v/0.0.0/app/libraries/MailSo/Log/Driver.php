<?php

namespace MailSo\Log;

/**
 * @category MailSo
 * @package Log
 */
abstract class Driver
{
	/**
	 * @var string
	 */
	protected $sDatePattern;

	/**
	 * @var string
	 */
	protected $sName;

	/**
	 * @var array
	 */
	protected $aPrefixes;

	/**
	 * @var bool
	 */
	protected $bTimePrefix;

	/**
	 * @var bool
	 */
	protected $bTypedPrefix;

	/**
	 * @var int
	 */
	private $iWriteOnTimeoutOnly;

	/**
	 * @var bool
	 */
	private $bWriteOnErrorOnly;

	/**
	 * @var bool
	 */
	private $bFlushCache;

	/**
	 * @var array
	 */
	private $aCache;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		$this->sDatePattern = 'H:i:s';
		$this->sName = 'INFO';
		$this->bTimePrefix = true;
		$this->bTypedPrefix = true;

		$this->iWriteOnTimeoutOnly = 0;
		$this->bWriteOnErrorOnly = false;
		$this->bFlushCache = false;
		$this->aCache = array();
		
		$this->aPrefixes = array(
			\MailSo\Log\Enumerations\Type::INFO => '[DATA]',
			\MailSo\Log\Enumerations\Type::SECURE => '[SECURE]',
			\MailSo\Log\Enumerations\Type::NOTE => '[NOTE]',
			\MailSo\Log\Enumerations\Type::TIME => '[TIME]',
			\MailSo\Log\Enumerations\Type::MEMORY => '[MEMORY]',
			\MailSo\Log\Enumerations\Type::NOTICE => '[NOTICE]',
			\MailSo\Log\Enumerations\Type::WARNING => '[WARNING]',
			\MailSo\Log\Enumerations\Type::ERROR => '[ERROR]',
		);
	}

	/**
	 * @return \MailSo\Log\Driver
	 */
	public function DisableTimePrefix()
	{
		$this->bTimePrefix = false;
		return $this;
	}

	/**
	 * @param bool $bValue
	 * 
	 * @return \MailSo\Log\Driver
	 */
	public function WriteOnErrorOnly($bValue)
	{
		$this->bWriteOnErrorOnly = !!$bValue;
		return $this;
	}

	/**
	 * @param int $iTimeout
	 *
	 * @return \MailSo\Log\Driver
	 */
	public function WriteOnTimeoutOnly($iTimeout)
	{
		$this->iWriteOnTimeoutOnly = (int) $iTimeout;
		if (0 > $this->iWriteOnTimeoutOnly)
		{
			$this->iWriteOnTimeoutOnly = 0;
		}
		
		return $this;
	}

	/**
	 * @return \MailSo\Log\Driver
	 */
	public function DisableTypedPrefix()
	{
		$this->bTypedPrefix = false;
		return $this;
	}

	/**
	 * @param string|array $mDesc
	 * @return bool
	 */
	abstract protected function writeImplementation($mDesc);

	/**
	 * @return bool
	 */
	protected function writeEmptyLineImplementation()
	{
		return $this->writeImplementation('');
	}

	/**
	 * @param string $sTimePrefix
	 * @param string $sDesc
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 * @param array $sName = ''
	 *
	 * @return string
	 */
	protected function loggerLineImplementation($sTimePrefix, $sDesc,
		$iType = \MailSo\Log\Enumerations\Type::INFO, $sName = '')
	{
		return ($this->bTimePrefix ? '['.$sTimePrefix.'] ' : '').
			($this->bTypedPrefix ? $this->getTypedPrefix($iType, $sName) : '').
			$sDesc;
	}

	/**
	 * @return bool
	 */
	protected function clearImplementation()
	{
		return true;
	}

	/**
	 * @return string
	 */
	protected function getTimeWithMicroSec()
	{
		$aMicroTimeItems = \explode(' ', \microtime());
		return \gmdate($this->sDatePattern, $aMicroTimeItems[1]).'.'.
			\str_pad((int) ($aMicroTimeItems[0] * 1000), 3, '0', STR_PAD_LEFT);
	}

	/**
	 * @param int $iType
	 * @param string $sName = ''
	 *
	 * @return string
	 */
	protected function getTypedPrefix($iType, $sName = '')
	{
		$sName = 0 < \strlen($sName) ? $sName : $this->sName;
		return isset($this->aPrefixes[$iType]) ? $sName.$this->aPrefixes[$iType].': ' : '';
	}

	/**
	 * @final
	 * @param string $sDesc
	 * @param int $iType = \MailSo\Log\Enumerations\Type::INFO
	 * @param string $sName = ''
	 *
	 * @return bool
	 */
	final public function Write($sDesc, $iType = \MailSo\Log\Enumerations\Type::INFO, $sName = '')
	{
		$bResult = true;
		if (!$this->bFlushCache && ($this->bWriteOnErrorOnly || 0 < $this->iWriteOnTimeoutOnly))
		{
			if ($this->bWriteOnErrorOnly && \in_array($iType, array(
				\MailSo\Log\Enumerations\Type::NOTICE,
				\MailSo\Log\Enumerations\Type::WARNING,
				\MailSo\Log\Enumerations\Type::ERROR
			)))
			{
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), '--- FlushCache: WriteOnErrorOnly', \MailSo\Log\Enumerations\Type::INFO, 'LOGS');
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName);

				$this->bFlushCache = true;
				$bResult = $this->writeImplementation($this->aCache);
				$this->aCache = array();
			}
			else if (0 < $this->iWriteOnTimeoutOnly && \time() - APP_START_TIME > $this->iWriteOnTimeoutOnly)
			{
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), '--- FlushCache: WriteOnTimeoutOnly['.
					(\time() - APP_START_TIME).'/'.$this->iWriteOnTimeoutOnly.']', \MailSo\Log\Enumerations\Type::NOTE, 'LOGS');

				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName);
				
				$this->bFlushCache = true;
				$bResult = $this->writeImplementation($this->aCache);
				$this->aCache = array();
			}
			else
			{
				$this->aCache[] = $this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName);
			}
		}
		else
		{
			$bResult = $this->writeImplementation(
				$this->loggerLineImplementation($this->getTimeWithMicroSec(), $sDesc, $iType, $sName));
		}

		return $bResult;
	}

	/**
	 * @final
	 * @return bool
	 */
	final public function Clear()
	{
		return $this->clearImplementation();
	}

	/**
	 * @final
	 * @return void
	 */
	final public function WriteEmptyLine()
	{
		if (!$this->bFlushCache && ($this->bWriteOnErrorOnly || 0 < $this->iWriteOnTimeoutOnly))
		{
			$this->aCache[] = '';
		}
		else
		{
			$this->writeEmptyLineImplementation();
		}
	}
}
