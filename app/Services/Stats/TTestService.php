<?php

namespace App\Services\Stats;

class TTestService
{
    protected static function mean(array $x){ return array_sum($x)/count($x); }
    protected static function variance(array $x){ $n=count($x); $m=self::mean($x); $a=0; foreach($x as $v){$a+=($v-$m)**2;} return $a/($n-1); }

    protected static function studentTCdf($t,$df){
        $x = $df / ($df + $t*$t);
        $a = $df/2; $b = 0.5;
        $ib = self::betaInc($x,$a,$b);
        $p = 0.5*$ib;
        return ($t>0) ? 1-$p : $p;
    }
    protected static function betaInc($x,$a,$b){
        $bt = ($x==0.0 || $x==1.0)?0.0:exp(self::logGamma($a+$b)-self::logGamma($a)-self::logGamma($b)+$a*log($x)+$b*log(1-$x));
        if ($x < ($a+1)/($a+$b+2)) return $bt*self::betaFrac($x,$a,$b)/$a; else return 1.0-$bt*self::betaFrac(1-$x,$b,$a)/$b;
    }
    protected static function betaFrac($x,$a,$b){
        $maxIter=200; $eps=1e-12; $am=1; $bm=1; $az=1; $qab=$a+$b; $qap=$a+1; $qam=$a-1; $bz=1-$qab*$x/$qap;
        for($m=1;$m<=$maxIter;$m++){
            $em=$m; $tem=$em+$em; $d=$em*($b-$em)*$x/(($qam+$tem)*($a+$tem)); $ap=$az+$d*$am; $bp=$bz+$d*$bm; $d= -($a+$em)*($qab+$em)*$x/(($a+$tem)*($qap+$tem)); $app=$ap+$d*$az; $bpp=$bp+$d*$bz; $am=$ap/$bpp; $bm=$bp/$bpp; $az=$app/$bpp; $bz=1; if(abs($app-$ap)/abs($app)<$eps) break; }
        return $az;
    }
    protected static function pValue($t,$df,$alt){
        $cdf=self::studentTCdf($t,$df);
        if($alt==='greater') return 1-$cdf;
        if($alt==='less') return $cdf;
        $tail=($t>0)?1-$cdf:$cdf; return 2*$tail;
    }

    public static function oneSample(array $sample, float $mu0, float $alpha, string $alt='two-sided'){
        $n=count($sample); if($n<2) throw new \Exception('Need >=2 observations');
        $mean=self::mean($sample); $var=self::variance($sample); $sd=sqrt($var); $t=($mean-$mu0)/($sd/sqrt($n)); $df=$n-1; $p=self::pValue($t,$df,$alt);
        $ciLevel = 1 - $alpha; // two-sided
        [$ciLower,$ciUpper] = self::confidenceIntervalMean($mean,$sd,$n,$alpha,'two-sided');
        return [
            'type'=>'one-sample','mean'=>$mean,'sd'=>$sd,'n'=>$n,'mu0'=>$mu0,'t'=>$t,'df'=>$df,'p_value'=>$p,'alpha'=>$alpha,'significant'=>$p<$alpha,'alternative'=>$alt,
            'ci_level'=>$ciLevel,'ci_lower'=>$ciLower,'ci_upper'=>$ciUpper
        ];
    }
    public static function twoSampleWelch(array $s1,array $s2,float $alpha,string $alt='two-sided'){
        $n1=count($s1); $n2=count($s2); if($n1<2||$n2<2) throw new \Exception('Need >=2 per group');
        $m1=self::mean($s1); $m2=self::mean($s2); $v1=self::variance($s1); $v2=self::variance($s2); $se=sqrt($v1/$n1+$v2/$n2); $t=($m1-$m2)/$se; $df=($v1/$n1+$v2/$n2)**2/((($v1*$v1)/(($n1*$n1)*($n1-1)))+(($v2*$v2)/(($n2*$n2)*($n2-1)))); $p=self::pValue($t,$df,$alt);
        [$ciLower,$ciUpper] = self::confidenceIntervalDiff($m1,$m2,$v1,$v2,$n1,$n2,$alpha,$df);
        return [
            'type'=>'two-sample-welch','mean1'=>$m1,'mean2'=>$m2,'sd1'=>sqrt($v1),'sd2'=>sqrt($v2),'n1'=>$n1,'n2'=>$n2,'t'=>$t,'df'=>$df,'p_value'=>$p,'alpha'=>$alpha,'significant'=>$p<$alpha,'alternative'=>$alt,
            'diff_mean'=>$m1-$m2,'ci_level'=>1-$alpha,'ci_lower'=>$ciLower,'ci_upper'=>$ciUpper
        ];
    }

    // Two One-Sided Tests (TOST) for range equivalence
    public static function tost(array $sample, float $lower, float $upper, float $alpha){
        $n=count($sample); if($n<2) throw new \Exception('Need >=2 observations');
        sort($sample); $mean=self::mean($sample); $var=self::variance($sample); $sd=sqrt($var); $se=$sd/sqrt($n); $df=$n-1;
        // Test lower bound: H0: mean <= lower
        $tLower=($mean-$lower)/$se; $pLower=self::pValue($tLower,$df,'less'); // actually we want p for mean <= lower so use 'less'
        // Test upper bound: H0: mean >= upper
        $tUpper=($mean-$upper)/$se; $pUpper=self::pValue($tUpper,$df,'greater');
        $equivalent=($pLower < $alpha) && ($pUpper < $alpha);
        // CI for TOST uses (1-2α) confidence level
        $ciAlpha = 2*$alpha; // to produce (1-2α) CI
        [$ciLower,$ciUpper] = self::confidenceIntervalMean($mean,$sd,$n,$ciAlpha,'two-sided');
        return [
            'type'=>'tost','mean'=>$mean,'sd'=>$sd,'n'=>$n,'lower'=>$lower,'upper'=>$upper,'t_lower'=>$tLower,'t_upper'=>$tUpper,'p_lower'=>$pLower,'p_upper'=>$pUpper,'alpha'=>$alpha,'equivalent'=>$equivalent,
            'significant'=>$equivalent,'ci_level'=>1-$ciAlpha,'ci_lower'=>$ciLower,'ci_upper'=>$ciUpper,
            'interpretation'=>$equivalent?'Mean within acceptable range (equivalent)':'Insufficient evidence that mean lies strictly within range'
        ];
    }

    // Confidence interval helpers
    protected static function invStudentT($prob,$df){
        // binary search on CDF
        $lo=-15; $hi=15; for($i=0;$i<80;$i++){ $mid=($lo+$hi)/2; $cdf=self::studentTCdf($mid,$df); if($cdf<$prob) $lo=$mid; else $hi=$mid; } return ($lo+$hi)/2;
    }
    protected static function confidenceIntervalMean($mean,$sd,$n,$alpha,$side){
        $df=$n-1; $se=$sd/sqrt($n); if($side==='two-sided'){ $tCrit=self::invStudentT(1-$alpha/2,$df); return [$mean-$tCrit*$se,$mean+$tCrit*$se]; }
        $tCrit=self::invStudentT(1-$alpha,$df); return [$mean-$tCrit*$se,$mean+$tCrit*$se];
    }
    protected static function confidenceIntervalDiff($m1,$m2,$v1,$v2,$n1,$n2,$alpha,$df){
        $diff=$m1-$m2; $se=sqrt($v1/$n1+$v2/$n2); $tCrit=self::invStudentT(1-$alpha/2,$df); return [$diff-$tCrit*$se,$diff+$tCrit*$se];
    }

    // Lanczos approximation for log Gamma function (positive real arguments)
    protected static function logGamma($z){
        // Coefficients for g=7, n=9 based on Numerical Recipes / common implementation
        static $p = [
            0.99999999999980993,
            676.5203681218851,
            -1259.1392167224028,
            771.32342877765313,
            -176.61502916214059,
            12.507343278686905,
            -0.13857109526572012,
            9.9843695780195716e-6,
            1.5056327351493116e-7
        ];
        if ($z < 0.5) {
            // Reflection (Gamma(z)Gamma(1-z)=pi/sin(pi z))
            return log(pi()) - log(sin(pi()*$z)) - self::logGamma(1-$z);
        }
        $z -= 1;
        $x = $p[0];
        for ($i=1; $i < count($p); $i++) {
            $x += $p[$i] / ($z + $i);
        }
        $g = 7;
        $t = $z + $g + 0.5;
        return 0.9189385332046727 + (($z+0.5)*log($t)) - $t + log($x); // 0.918... = 0.5*log(2*pi)
    }
}
