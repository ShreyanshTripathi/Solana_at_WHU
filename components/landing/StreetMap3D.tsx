// An illustrated, animated 3D view of a street: solar roofs send power along glowing arcs to their
// neighbours, carried by Volty the mascot; a blue arc brings power from the next community. The
// houses are drawn for clarity (an illustration, not a map), so it renders anywhere without tiles.
export function StreetMap3D({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 960 640"
      className="block h-auto w-full"
      role="img"
      aria-label={label}
    >
      <circle cx="860" cy="90" r="80" fill="#FFD9B0" fillOpacity="0.35" />
      <circle cx="860" cy="90" r="34" fill="#FFC48A" fillOpacity="0.75" />
      <polygon
        points="420.0,70.0 939.6,370.0 541.2,600.0 21.6,300.0"
        fill="#F4F3EE"
        stroke="#E6E5DF"
        strokeWidth="1"
      />
      <polygon
        points="407.0,407.5 510.9,467.5 428.7,515.0 324.7,455.0"
        fill="#E3EEDC"
      />
      <polygon
        points="134.2,255.0 220.8,305.0 142.9,350.0 56.3,300.0"
        fill="#E3EEDC"
      />
      <polygon
        points="242.5,172.5 762.1,472.5 731.8,490.0 212.2,190.0"
        fill="#FFFFFF"
        stroke="#E2E1DA"
        strokeWidth="1"
      />
      <polygon
        points="666.8,212.5 697.1,230.0 298.8,460.0 268.4,442.5"
        fill="#FFFFFF"
        stroke="#E2E1DA"
        strokeWidth="1"
      />
      <path
        d="M236.0,186.2 L251.6,195.2 M270.6,206.2 L286.2,215.2 M305.3,226.2 L320.8,235.2 M339.9,246.2 L355.5,255.2 M374.5,266.2 L390.1,275.2 M409.2,286.2 L424.8,295.2 M443.8,306.2 L459.4,315.2 M513.1,346.2 L528.7,355.2 M547.7,366.2 L563.3,375.2 M582.4,386.2 L598.0,395.2 M617.0,406.2 L632.6,415.2 M651.7,426.2 L667.2,435.2 M686.3,446.2 L701.9,455.2 M720.9,466.2 L736.5,475.2 M673.3,226.2 L657.7,235.2 M638.7,246.2 L623.1,255.2 M604.0,266.2 L588.4,275.2 M569.4,286.2 L553.8,295.2 M534.7,306.2 L519.2,315.2 M465.5,346.2 L449.9,355.2 M430.8,366.2 L415.2,375.2 M396.2,386.2 L380.6,395.2 M361.5,406.2 L346.0,415.2 M326.9,426.2 L311.3,435.2 M292.3,446.2 L276.7,455.2"
        stroke="#E2E1DA"
        strokeWidth="1.5"
        fill="none"
      />
      <polygon
        points="420.0,118.0 487.5,157.0 433.9,188.0 366.3,149.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="482.4,146.0 433.9,174.0 433.9,140.0 482.4,112.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="371.5,138.0 433.9,174.0 433.9,140.0 371.5,104.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="420.0,76.0 482.4,112.0 433.9,140.0 371.5,104.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="381.9,132.1 390.6,137.1 390.6,126.9 381.9,121.9"
        fill="#C9D6E3"
      />
      <polygon
        points="397.5,141.1 406.1,146.1 406.1,135.9 397.5,130.9"
        fill="#C9D6E3"
      />
      <polygon
        points="413.1,150.1 421.7,155.1 421.7,144.9 413.1,139.9"
        fill="#C9D6E3"
      />
      <polygon
        points="420.0,84.0 468.5,112.0 433.9,132.0 385.4,104.0"
        fill="#22324A"
      />
      <path
        d="M432.1,91.0 L397.5,111.0 M444.2,98.0 L409.6,118.0 M456.4,105.0 L421.7,125.0 M402.7,94.0 L451.2,122.0"
        stroke="#8FA3BF"
        strokeWidth="0.8"
        fill="none"
      />
      <text
        x="426.9"
        y="66.0"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#111111"
      >
        Anna
      </text>
      <ellipse
        cx="408.7"
        cy="212.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="402.7"
        y1="210.0"
        x2="402.7"
        y2="194.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="402.7" cy="188.0" r="10" fill="#B9D7A8" />
      <circle cx="399.7" cy="185.0" r="6" fill="#CFE5C1" />
      <polygon
        points="343.8,162.0 402.7,196.0 352.5,225.0 293.6,191.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="397.5,185.0 352.5,211.0 352.5,187.0 397.5,161.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="298.8,180.0 352.5,211.0 352.5,187.0 298.8,156.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="343.8,130.0 397.5,161.0 352.5,187.0 298.8,156.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="307.0,176.3 315.6,181.3 315.6,174.2 307.0,169.2"
        fill="#C9D6E3"
      />
      <polygon
        points="320.4,184.1 329.1,189.1 329.1,181.9 320.4,176.9"
        fill="#C9D6E3"
      />
      <polygon
        points="333.8,191.8 342.5,196.8 342.5,189.7 333.8,184.7"
        fill="#C9D6E3"
      />
      <text
        x="348.1"
        y="140.5"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#6B6B66"
      >
        No. 14
      </text>
      <ellipse
        cx="590.5"
        cy="227.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="584.5"
        y1="225.0"
        x2="584.5"
        y2="209.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="584.5" cy="203.0" r="10" fill="#B9D7A8" />
      <circle cx="581.5" cy="200.0" r="6" fill="#CFE5C1" />
      <polygon
        points="508.3,177.0 575.9,216.0 522.2,247.0 454.6,208.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="570.7,205.0 522.2,233.0 522.2,203.0 570.7,175.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="459.8,197.0 522.2,233.0 522.2,203.0 459.8,167.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="508.3,139.0 570.7,175.0 522.2,203.0 459.8,167.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="470.2,192.5 478.9,197.5 478.9,188.5 470.2,183.5"
        fill="#C9D6E3"
      />
      <polygon
        points="485.8,201.5 494.5,206.5 494.5,197.5 485.8,192.5"
        fill="#C9D6E3"
      />
      <polygon
        points="501.4,210.5 510.1,215.5 510.1,206.5 501.4,201.5"
        fill="#C9D6E3"
      />
      <polygon
        points="508.3,147.0 556.8,175.0 522.2,195.0 473.7,167.0"
        fill="#22324A"
      />
      <path
        d="M520.5,154.0 L485.8,174.0 M532.6,161.0 L497.9,181.0 M544.7,168.0 L510.1,188.0 M491.0,157.0 L539.5,185.0"
        stroke="#8FA3BF"
        strokeWidth="0.8"
        fill="none"
      />
      <text
        x="545.3"
        y="140.0"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#111111"
      >
        Carla
      </text>
      <ellipse
        cx="330.7"
        cy="257.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="324.7"
        y1="255.0"
        x2="324.7"
        y2="239.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="324.7" cy="233.0" r="10" fill="#B9D7A8" />
      <circle cx="321.7" cy="230.0" r="6" fill="#CFE5C1" />
      <ellipse
        cx="512.6"
        cy="272.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="506.6"
        y1="270.0"
        x2="506.6"
        y2="254.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="506.6" cy="248.0" r="10" fill="#B9D7A8" />
      <circle cx="503.6" cy="245.0" r="6" fill="#CFE5C1" />
      <polygon
        points="222.6,232.0 290.1,271.0 236.4,302.0 168.9,263.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="284.9,260.0 236.4,288.0 236.4,258.0 284.9,230.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="174.1,252.0 236.4,288.0 236.4,258.0 174.1,222.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="222.6,194.0 284.9,230.0 236.4,258.0 174.1,222.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="184.4,247.5 193.1,252.5 193.1,243.5 184.4,238.5"
        fill="#C9D6E3"
      />
      <polygon
        points="200.0,256.5 208.7,261.5 208.7,252.5 200.0,247.5"
        fill="#C9D6E3"
      />
      <polygon
        points="215.6,265.5 224.3,270.5 224.3,261.5 215.6,256.5"
        fill="#C9D6E3"
      />
      <polygon
        points="222.6,202.0 271.0,230.0 236.4,250.0 187.9,222.0"
        fill="#22324A"
      />
      <path
        d="M234.7,209.0 L200.0,229.0 M246.8,216.0 L212.2,236.0 M258.9,223.0 L224.3,243.0 M205.2,212.0 L253.7,240.0"
        stroke="#8FA3BF"
        strokeWidth="0.8"
        fill="none"
      />
      <text
        x="200.5"
        y="196.0"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#111111"
      >
        Weber
      </text>
      <ellipse
        cx="157.5"
        cy="317.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="151.5"
        y1="315.0"
        x2="151.5"
        y2="299.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="151.5" cy="293.0" r="10" fill="#B9D7A8" />
      <circle cx="148.5" cy="290.0" r="6" fill="#CFE5C1" />
      <polygon
        points="307.4,303.0 366.3,337.0 316.1,366.0 257.2,332.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="361.1,326.0 316.1,352.0 316.1,326.0 361.1,300.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="262.4,321.0 316.1,352.0 316.1,326.0 262.4,295.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="307.4,269.0 361.1,300.0 316.1,326.0 262.4,295.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="270.6,316.6 279.3,321.6 279.3,313.9 270.6,308.9"
        fill="#C9D6E3"
      />
      <polygon
        points="284.0,324.4 292.7,329.4 292.7,321.6 284.0,316.6"
        fill="#C9D6E3"
      />
      <polygon
        points="297.5,332.1 306.1,337.1 306.1,329.4 297.5,324.4"
        fill="#C9D6E3"
      />
      <text
        x="340.8"
        y="268.5"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#111111"
      >
        Ben
      </text>
      <ellipse
        cx="348.1"
        cy="357.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="342.1"
        y1="355.0"
        x2="342.1"
        y2="339.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="342.1" cy="333.0" r="10" fill="#B9D7A8" />
      <circle cx="339.1" cy="330.0" r="6" fill="#CFE5C1" />
      <polygon
        points="697.1,278.0 806.2,341.0 737.0,381.0 627.8,318.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="801.0,330.0 737.0,367.0 737.0,321.0 801.0,284.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="633.0,307.0 737.0,367.0 737.0,321.0 633.0,261.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="697.1,224.0 801.0,284.0 737.0,321.0 633.0,261.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="653.8,302.9 662.5,307.9 662.5,294.1 653.8,289.1"
        fill="#C9D6E3"
      />
      <polygon
        points="679.8,317.9 688.5,322.9 688.5,309.1 679.8,304.1"
        fill="#C9D6E3"
      />
      <polygon
        points="705.8,332.9 714.4,337.9 714.4,324.1 705.8,319.1"
        fill="#C9D6E3"
      />
      <polygon
        points="638.2,275.5 731.8,329.5 725.7,339.0 632.2,285.0"
        fill="#F3B48A"
      />
      <text
        x="760.0"
        y="236.0"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="13"
        fontWeight="600"
        fill="#111111"
      >
        Bäckerei Müller
      </text>
      <ellipse
        cx="859.0"
        cy="382.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="853.0"
        y1="380.0"
        x2="853.0"
        y2="364.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="853.0" cy="358.0" r="10" fill="#B9D7A8" />
      <circle cx="850.0" cy="355.0" r="6" fill="#CFE5C1" />
      <ellipse
        cx="677.1"
        cy="397.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="671.1"
        y1="395.0"
        x2="671.1"
        y2="379.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="671.1" cy="373.0" r="10" fill="#B9D7A8" />
      <circle cx="668.1" cy="370.0" r="6" fill="#CFE5C1" />
      <polygon
        points="749.1,388.0 808.0,422.0 754.3,453.0 695.4,419.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="802.8,411.0 754.3,439.0 754.3,407.0 802.8,379.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="700.6,408.0 754.3,439.0 754.3,407.0 700.6,376.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="749.1,348.0 802.8,379.0 754.3,407.0 700.6,376.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="708.8,401.6 717.5,406.6 717.5,396.9 708.8,391.9"
        fill="#C9D6E3"
      />
      <polygon
        points="722.2,409.3 730.9,414.3 730.9,404.7 722.2,399.7"
        fill="#C9D6E3"
      />
      <polygon
        points="735.7,417.1 744.3,422.1 744.3,412.4 735.7,407.4"
        fill="#C9D6E3"
      />
      <polygon
        points="749.1,356.0 788.9,379.0 754.3,399.0 714.4,376.0"
        fill="#22324A"
      />
      <path
        d="M759.0,361.8 L724.4,381.8 M769.0,367.5 L734.4,387.5 M779.0,373.2 L744.3,393.2 M731.8,366.0 L771.6,389.0"
        stroke="#8FA3BF"
        strokeWidth="0.8"
        fill="none"
      />
      <text
        x="790.7"
        y="350.5"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#111111"
      >
        Emil
      </text>
      <ellipse
        cx="434.7"
        cy="467.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="428.7"
        y1="465.0"
        x2="428.7"
        y2="449.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="428.7" cy="443.0" r="10" fill="#B9D7A8" />
      <circle cx="425.7" cy="440.0" r="6" fill="#CFE5C1" />
      <polygon
        points="497.9,393.0 607.1,456.0 537.8,496.0 428.7,433.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="601.9,445.0 537.8,482.0 537.8,432.0 601.9,395.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="433.9,422.0 537.8,482.0 537.8,432.0 433.9,372.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="497.9,335.0 601.9,395.0 537.8,432.0 433.9,372.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="454.6,416.5 463.3,421.5 463.3,406.5 454.6,401.5"
        fill="#C9D6E3"
      />
      <polygon
        points="480.6,431.5 489.3,436.5 489.3,421.5 480.6,416.5"
        fill="#C9D6E3"
      />
      <polygon
        points="506.6,446.5 515.3,451.5 515.3,436.5 506.6,431.5"
        fill="#C9D6E3"
      />
      <polygon
        points="439.1,387.5 532.6,441.5 526.5,451.5 433.0,397.5"
        fill="#F3B48A"
      />
      <text
        x="440.0"
        y="350.0"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="13"
        fontWeight="600"
        fill="#111111"
      >
        Praxis Dr. Klein
      </text>
      <polygon
        points="601.9,473.0 657.3,505.0 607.1,534.0 551.6,502.0"
        fill="#000000"
        fillOpacity="0.05"
      />
      <polygon
        points="652.1,494.0 607.1,520.0 607.1,492.0 652.1,466.0"
        fill="#EDECE6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="556.8,491.0 607.1,520.0 607.1,492.0 556.8,463.0"
        fill="#DEDDD6"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="601.9,437.0 652.1,466.0 607.1,492.0 556.8,463.0"
        fill="#FFFFFF"
        stroke="#D3D2CB"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <polygon
        points="564.2,485.4 572.8,490.4 572.8,482.1 564.2,477.1"
        fill="#C9D6E3"
      />
      <polygon
        points="576.7,492.7 585.4,497.7 585.4,489.3 576.7,484.3"
        fill="#C9D6E3"
      />
      <polygon
        points="589.3,499.9 598.0,504.9 598.0,496.6 589.3,491.6"
        fill="#C9D6E3"
      />
      <text
        x="640.0"
        y="452.0"
        textAnchor="middle"
        fontFamily="Geist, sans-serif"
        fontSize="12"
        fontWeight="500"
        fill="#111111"
      >
        Dana
      </text>
      <ellipse
        cx="581.9"
        cy="542.0"
        rx="9"
        ry="4.5"
        fill="#000000"
        fillOpacity="0.06"
      />
      <line
        x1="575.9"
        y1="540.0"
        x2="575.9"
        y2="524.0"
        stroke="#B7A58A"
        strokeWidth="2"
      />
      <circle cx="575.9" cy="518.0" r="10" fill="#B9D7A8" />
      <circle cx="572.9" cy="515.0" r="6" fill="#CFE5C1" />

      <defs>
        <linearGradient id="vt-sun-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFD23F" />
          <stop offset="100%" stopColor="#FF7A1A" />
        </linearGradient>
        <linearGradient id="vt-volty-body" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="55%" stopColor="#FCC419" />
          <stop offset="100%" stopColor="#F59F00" />
        </linearGradient>
        <g id="vt-volty">
          <g transform="translate(-20.8,-19.2) scale(0.32)">
            <path
              d="M70 6 L23 66 L51 66 L41 114 L97 47 L67 47 L81 6 Z"
              fill="url(#vt-volty-body)"
              stroke="#E8590C"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M70 15 L41 54"
              stroke="#FFF9DB"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.8"
            />
            <ellipse
              cx="46"
              cy="63"
              rx="5"
              ry="3"
              fill="#FF8787"
              opacity="0.55"
            />
            <ellipse
              cx="77"
              cy="60"
              rx="5"
              ry="3"
              fill="#FF8787"
              opacity="0.55"
            />
            <circle
              cx="53"
              cy="55"
              r="5.5"
              fill="#FFFFFF"
              stroke="#7A3E00"
              strokeWidth="1.5"
            />
            <circle
              cx="68"
              cy="54"
              r="5.5"
              fill="#FFFFFF"
              stroke="#7A3E00"
              strokeWidth="1.5"
            />
            <circle cx="54" cy="56" r="2.8" fill="#2B1A00" />
            <circle cx="69" cy="55" r="2.8" fill="#2B1A00" />
            <path
              d="M56 64 Q62 71 69 63"
              fill="#7A3E00"
              stroke="#7A3E00"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        </g>
      </defs>
      <g fill="none" strokeLinecap="round">
        <path
          d="M426.9,108.0 Q572.0,-75.4 717.0,272.5"
          stroke="#FFB020"
          strokeOpacity="0.22"
          strokeWidth="12"
        />
        <path
          d="M426.9,108.0 Q572.0,-75.4 717.0,272.5"
          stroke="url(#vt-sun-line)"
          strokeWidth="3.5"
        />
        <path
          d="M426.9,108.0 Q572.0,-75.4 717.0,272.5"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.5"
          strokeDasharray="2 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="36"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M515.3,171.0 Q616.1,46.8 717.0,272.5"
          stroke="#FFB020"
          strokeOpacity="0.22"
          strokeWidth="12"
        />
        <path
          d="M515.3,171.0 Q616.1,46.8 717.0,272.5"
          stroke="url(#vt-sun-line)"
          strokeWidth="3.5"
        />
        <path
          d="M515.3,171.0 Q616.1,46.8 717.0,272.5"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.5"
          strokeDasharray="2 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="36"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M515.3,171.0 Q516.6,54.1 517.9,383.5"
          stroke="#FFB020"
          strokeOpacity="0.22"
          strokeWidth="12"
        />
        <path
          d="M515.3,171.0 Q516.6,54.1 517.9,383.5"
          stroke="url(#vt-sun-line)"
          strokeWidth="3.5"
        />
        <path
          d="M515.3,171.0 Q516.6,54.1 517.9,383.5"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.5"
          strokeDasharray="2 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="36"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M751.7,377.5 Q634.8,248.9 517.9,383.5"
          stroke="#FFB020"
          strokeOpacity="0.22"
          strokeWidth="12"
        />
        <path
          d="M751.7,377.5 Q634.8,248.9 517.9,383.5"
          stroke="url(#vt-sun-line)"
          strokeWidth="3.5"
        />
        <path
          d="M751.7,377.5 Q634.8,248.9 517.9,383.5"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.5"
          strokeDasharray="2 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="36"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M229.5,226.0 Q270.6,156.0 311.8,297.5"
          stroke="#FFB020"
          strokeOpacity="0.22"
          strokeWidth="12"
        />
        <path
          d="M229.5,226.0 Q270.6,156.0 311.8,297.5"
          stroke="url(#vt-sun-line)"
          strokeWidth="3.5"
        />
        <path
          d="M229.5,226.0 Q270.6,156.0 311.8,297.5"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.5"
          strokeDasharray="2 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="36"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
        <path
          d="M905.0,560.0 Q754.8,291.1 604.5,464.5"
          stroke="#2563EB"
          strokeOpacity="0.16"
          strokeWidth="12"
        />
        <path
          d="M905.0,560.0 Q754.8,291.1 604.5,464.5"
          stroke="#2563EB"
          strokeWidth="3"
        />
        <path
          d="M905.0,560.0 Q754.8,291.1 604.5,464.5"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.5"
          strokeDasharray="2 16"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="36"
            to="0"
            dur="0.9s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      <g fill="none" strokeWidth="2">
        <circle cx="717.0" cy="272.5" r="4" stroke="#FF7A1A">
          <animate
            attributeName="r"
            from="4"
            to="24"
            dur="1.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            from="0.7"
            to="0"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="517.9" cy="383.5" r="4" stroke="#FF7A1A">
          <animate
            attributeName="r"
            from="4"
            to="24"
            dur="1.8s"
            begin="0.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            from="0.7"
            to="0"
            dur="1.8s"
            begin="0.6s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="311.8" cy="297.5" r="4" stroke="#FF7A1A">
          <animate
            attributeName="r"
            from="4"
            to="20"
            dur="1.8s"
            begin="1.1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            from="0.7"
            to="0"
            dur="1.8s"
            begin="1.1s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="604.5" cy="464.5" r="4" stroke="#2563EB">
          <animate
            attributeName="r"
            from="4"
            to="20"
            dur="1.8s"
            begin="0.3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-opacity"
            from="0.7"
            to="0"
            dur="1.8s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      <g>
        <g>
          <animateMotion
            dur="3.2s"
            repeatCount="indefinite"
            path="M426.9,108.0 Q572.0,-75.4 717.0,272.5"
          />
          <circle r="20" fill="#FFD23F" fillOpacity="0.3" />
          <use href="#vt-volty" />
        </g>
        <g>
          <animateMotion
            dur="2.7s"
            begin="0.7s"
            repeatCount="indefinite"
            path="M515.3,171.0 Q616.1,46.8 717.0,272.5"
          />
          <circle r="20" fill="#FFD23F" fillOpacity="0.3" />
          <use href="#vt-volty" />
        </g>
        <g>
          <animateMotion
            dur="3s"
            begin="1.2s"
            repeatCount="indefinite"
            path="M515.3,171.0 Q516.6,54.1 517.9,383.5"
          />
          <circle r="20" fill="#FFD23F" fillOpacity="0.3" />
          <use href="#vt-volty" />
        </g>
        <g>
          <animateMotion
            dur="2.5s"
            begin="0.4s"
            repeatCount="indefinite"
            path="M751.7,377.5 Q634.8,248.9 517.9,383.5"
          />
          <circle r="20" fill="#FFD23F" fillOpacity="0.3" />
          <use href="#vt-volty" />
        </g>
        <g>
          <animateMotion
            dur="2.1s"
            begin="0.2s"
            repeatCount="indefinite"
            path="M229.5,226.0 Q270.6,156.0 311.8,297.5"
          />
          <circle r="20" fill="#FFD23F" fillOpacity="0.3" />
          <use href="#vt-volty" />
        </g>
        <g>
          <animateMotion
            dur="2.9s"
            begin="0.9s"
            repeatCount="indefinite"
            path="M905.0,560.0 Q754.8,291.1 604.5,464.5"
          />
          <circle r="20" fill="#2563EB" fillOpacity="0.16" />
          <use href="#vt-volty" />
        </g>
      </g>

      <g transform="translate(850,560)">
        <rect width="104" height="28" rx="14" fill="#FFFFFF" stroke="#BFD3FB" />
        <circle cx="15" cy="14" r="4" fill="#2563EB" />
        <text
          x="26"
          y="18"
          fontFamily="Geist, sans-serif"
          fontSize="12"
          fontWeight="500"
          fill="#1D4ED8"
        >
          Mallendar
        </text>
      </g>
    </svg>
  );
}
